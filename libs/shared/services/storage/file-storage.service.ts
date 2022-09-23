import { BlobClient, BlobDeleteIfExistsResponse, BlobSASPermissions, BlobSASSignatureValues, generateBlobSASQueryParameters, SASProtocol, StorageSharedKeyCredential } from '@azure/storage-blob';
import { injectable } from 'inversify';
import { extname, join } from 'path';

import { FILE_STORAGE_CONFIG } from '../../config/file-storage.config';
import { ServiceUnavailableError, GenericErrorsEnum } from '../../errors';


enum StoragePermissionsEnum {
  READ = 'r',
  WRITE = 'w',
  ADD = 'a',
  DELETE = 'd',
  CREATE = 'c'
}


@injectable()
export class FileStorageService {

  constructor() { }

  private getUrl(filename: string, permissions: string): string {

    const starts = new Date();
    const expires = new Date(starts.getTime() + 900_000); // 15 minutes.

    const signature: BlobSASSignatureValues = {
      protocol: SASProtocol.HttpsAndHttp,
      startsOn: starts,
      expiresOn: expires,
      permissions: BlobSASPermissions.parse(permissions),
      containerName: FILE_STORAGE_CONFIG.storageContainer,
      blobName: filename
    };

    const storageSharedKeyCredential = new StorageSharedKeyCredential(
      FILE_STORAGE_CONFIG.storageAccount,
      FILE_STORAGE_CONFIG.storageKey
    );

    try {

      const query = generateBlobSASQueryParameters(signature, storageSharedKeyCredential);
      return `${join(FILE_STORAGE_CONFIG.storageBaseUrl, FILE_STORAGE_CONFIG.storageContainer, filename)}?${query.toString()}`;

    } catch (error) {
      // TODO: Log this here!
      throw new ServiceUnavailableError(GenericErrorsEnum.SERVICE_FILE_STORAGE_ERROR);
    }
  }

  getDownloadUrl(id: string, filename: string): string {
    return this.getUrl(`${id}${extname(filename)}`, StoragePermissionsEnum.READ);
  }

  getUploadUrl(id: string, filename: string): string {
    return this.getUrl(`${id}${extname(filename)}`, StoragePermissionsEnum.CREATE + StoragePermissionsEnum.WRITE);
  }


  async deleteFile(id: string, filename: string): Promise<BlobDeleteIfExistsResponse> {

    try {

      const url = join(FILE_STORAGE_CONFIG.storageBaseUrl, FILE_STORAGE_CONFIG.storageContainer, `${id}${extname(filename)}`);
      const storageSharedKeyCredential = new StorageSharedKeyCredential(FILE_STORAGE_CONFIG.storageAccount, FILE_STORAGE_CONFIG.storageKey);
      const blobClient = new BlobClient(url, storageSharedKeyCredential);
      const response = await blobClient.deleteIfExists({ deleteSnapshots: 'include' });

      if (response.errorCode) {
        // TODO: throw known error!
        throw new Error(
          `Failed to delete the file ${filename} with errorCode: ${response.errorCode}`
        );
      }

      return response;

    } catch (error) {
      // TODO: Log this here!
      throw new ServiceUnavailableError(GenericErrorsEnum.SERVICE_FILE_STORAGE_ERROR);
    }

  }

}
