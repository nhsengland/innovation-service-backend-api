import {
  BlobClient,
  type BlobDeleteIfExistsResponse,
  BlobSASPermissions,
  BlobSASSignatureValues,
  generateBlobSASQueryParameters,
  SASProtocol,
  StorageSharedKeyCredential
} from '@azure/storage-blob';
import { inject, injectable } from 'inversify';
import { extname } from 'path';

import { basename } from 'path';
import { FILE_STORAGE_CONFIG } from '../../config/file-storage.config';
import { GenericErrorsEnum, ServiceUnavailableError } from '../../errors';
import { LoggerService } from '../integrations/logger.service';
import SHARED_SYMBOLS from '../symbols';
import { classifyFileScan, type FileDownloadAccess, type FileScanStatus } from './file-scan-policy';

enum StoragePermissionsEnum {
  READ = 'r',
  TAG = 't',
  CREATE = 'c'
}

@injectable()
export class FileStorageService {
  constructor(@inject(SHARED_SYMBOLS.LoggerService) private logger: LoggerService) {}

  private getUrl(storageId: string, permissions: string, displayName: string): string {
    const starts = new Date();
    const expires = new Date(starts.getTime() + 900_000); // 15 minutes.

    // sanitize the displayName to remove any special characters causing issues with the contentDisposition (,)
    displayName = displayName.replace(/[^a-zA-Z0-9-_. ]/g, '');
    // if the displayName is empty, set it to the uuid filename (ie: chinese characters will be removed by the sanitize above)
    const filenameWithoutExtension = basename(displayName, extname(displayName));
    if (!filenameWithoutExtension.match(/\w+/)) {
      displayName = storageId;
    }

    const signature: BlobSASSignatureValues = {
      protocol: SASProtocol.Https,
      startsOn: starts,
      expiresOn: expires,
      permissions: BlobSASPermissions.parse(permissions),
      containerName: FILE_STORAGE_CONFIG.storageContainer,
      blobName: storageId,
      contentDisposition: `filename=${displayName}`
    };

    const storageSharedKeyCredential = new StorageSharedKeyCredential(
      FILE_STORAGE_CONFIG.storageAccount,
      FILE_STORAGE_CONFIG.storageKey
    );

    try {
      const query = generateBlobSASQueryParameters(signature, storageSharedKeyCredential);
      return (
        [FILE_STORAGE_CONFIG.storageBaseUrl, FILE_STORAGE_CONFIG.storageContainer, storageId]
          .filter(Boolean)
          .join('/') +
        '?' +
        query.toString()
      );
    } catch {
      // TODO: Log this here!
      throw new ServiceUnavailableError(GenericErrorsEnum.SERVICE_FILE_STORAGE_ERROR);
    }
  }

  private getBlobClient(storageId: string): BlobClient {
    const url = [FILE_STORAGE_CONFIG.storageBaseUrl, FILE_STORAGE_CONFIG.storageContainer, storageId]
      .filter(Boolean)
      .join('/');
    return new BlobClient(
      url,
      new StorageSharedKeyCredential(FILE_STORAGE_CONFIG.storageAccount, FILE_STORAGE_CONFIG.storageKey),
      { retryOptions: { maxTries: 2, tryTimeoutInMs: 5_000 } }
    );
  }

  async getFileScanStatus(storageId: string): Promise<FileScanStatus> {
    try {
      const blob = this.getBlobClient(storageId);
      const properties = await blob.getProperties();
      const { tags } = await blob.getTags();
      const status = classifyFileScan({
        exists: true,
        tags,
        uploadedAtMs: properties.createdOn?.getTime(),
        nowMs: Date.now()
      });
      this.logger.log('FileStorage::scanStatus', { storageId, scanState: status.state });
      if (!properties.createdOn && status.state === 'scanning') {
        this.logger.log('FileStorage::missingCreationTime', { storageId });
      }
      return status;
    } catch (error) {
      // Never log SDK errors: they can include signed URLs or request credentials.
      const storageError = error as { statusCode?: number; code?: string; details?: { errorCode?: string } };
      const statusCode = storageError?.statusCode;
      const errorCode = storageError?.code ?? storageError?.details?.errorCode;
      const removed = statusCode === 404 && errorCode === 'BlobNotFound';
      this.logger.log('FileStorage::scanLookupFailed', {
        storageId,
        statusCode,
        reason: statusCode === 404 ? 'not_found' : 'storage_unavailable'
      });
      return { state: removed ? 'removed' : 'unavailable', canDownload: false };
    }
  }

  async getDownloadAccess(storageId: string, filename: string): Promise<FileDownloadAccess> {
    const status = await this.getFileScanStatus(storageId);
    try {
      return {
        scanState: status.state,
        canDownload: status.canDownload,
        ...(status.canDownload && { url: this.getUrl(storageId, StoragePermissionsEnum.READ, filename) })
      };
    } catch {
      this.logger.log('FileStorage::downloadSigningFailed', { storageId });
      return { scanState: 'unavailable', canDownload: false };
    }
  }

  async getDownloadAccessForFiles(
    files: readonly { storageId: string; filename: string }[]
  ): Promise<Map<string, FileDownloadAccess>> {
    // Request-local deduplication and at most five concurrent Blob lookups.
    const uniqueFiles = [...new Map(files.map(file => [file.storageId, file])).values()];
    const access = new Map<string, FileDownloadAccess>();
    for (let i = 0; i < uniqueFiles.length; i += 5) {
      await Promise.all(
        uniqueFiles.slice(i, i + 5).map(async file => {
          access.set(file.storageId, await this.getDownloadAccess(file.storageId, file.filename));
        })
      );
    }
    return access;
  }

  getUploadUrl(storageId: string, filename: string): string {
    return this.getUrl(storageId, StoragePermissionsEnum.CREATE + StoragePermissionsEnum.TAG, filename);
  }

  async deleteFile(storageId: string): Promise<BlobDeleteIfExistsResponse> {
    try {
      const url = [FILE_STORAGE_CONFIG.storageBaseUrl, FILE_STORAGE_CONFIG.storageContainer, storageId]
        .filter(Boolean)
        .join('/');
      const storageSharedKeyCredential = new StorageSharedKeyCredential(
        FILE_STORAGE_CONFIG.storageAccount,
        FILE_STORAGE_CONFIG.storageKey
      );
      const blobClient = new BlobClient(url, storageSharedKeyCredential);
      const response = await blobClient.deleteIfExists({ deleteSnapshots: 'include' });

      if (response.errorCode && response.errorCode !== 'BlobNotFound') {
        // TODO: throw known error!
        throw new Error(`Failed to delete the file ${storageId} with errorCode: ${response.errorCode}`);
      }

      return response;
    } catch {
      // TODO: Log this here!
      throw new ServiceUnavailableError(GenericErrorsEnum.SERVICE_FILE_STORAGE_ERROR);
    }
  }
}
