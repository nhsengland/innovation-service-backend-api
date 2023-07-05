import {
  BlobClient,
  BlobDeleteIfExistsResponse,
  BlobSASPermissions,
  BlobSASSignatureValues,
  generateBlobSASQueryParameters,
  SASProtocol,
  StorageSharedKeyCredential
} from '@azure/storage-blob';
import { injectable } from 'inversify';
import { extname } from 'path';

import { basename } from 'path';
import { FILE_STORAGE_CONFIG } from '../../config/file-storage.config';
import { GenericErrorsEnum, ServiceUnavailableError } from '../../errors';

enum StoragePermissionsEnum {
  READ = 'r',
  WRITE = 'w',
  ADD = 'a',
  DELETE = 'd',
  CREATE = 'c'
}

@injectable()
export class FileStorageService {
  constructor() {}

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
      protocol: SASProtocol.HttpsAndHttp,
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
    } catch (error) {
      // TODO: Log this here!
      throw new ServiceUnavailableError(GenericErrorsEnum.SERVICE_FILE_STORAGE_ERROR);
    }
  }

  getDownloadUrl(storageId: string, filename: string): string {
    return this.getUrl(storageId, StoragePermissionsEnum.READ, filename);
  }

  getUploadUrl(storageId: string, filename: string): string {
    return this.getUrl(
      storageId,
      StoragePermissionsEnum.READ + StoragePermissionsEnum.CREATE + StoragePermissionsEnum.WRITE,
      filename
    );
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
    } catch (error) {
      // TODO: Log this here!
      throw new ServiceUnavailableError(GenericErrorsEnum.SERVICE_FILE_STORAGE_ERROR);
    }
  }
}
