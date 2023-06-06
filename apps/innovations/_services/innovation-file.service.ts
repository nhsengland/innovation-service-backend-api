import { inject, injectable } from 'inversify';
import { basename, extname } from 'path';

import type { EntityManager } from 'typeorm';

import { InnovationFileLegacyEntity } from '@innovations/shared/entities';
import type { FileStorageService } from '@innovations/shared/services';

import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import { BaseService } from './base.service';

@injectable()
export class InnovationFileService extends BaseService {
  constructor(@inject(SHARED_SYMBOLS.FileStorageService) private fileStorageService: FileStorageService) {
    super();
  }

  /**
   * uploads a file to the innovation
   * @param userId the user identifier making the request
   * @param innovationId the innovation identifier
   * @param filename the file name
   * @param context optional context for the file
   * @param em optional entity manager to use for the transaction
   * @returns the created file and the url to upload the file to
   */
  async uploadInnovationFile(
    userId: string,
    innovationId: string,
    filename: string,
    context: null | string,
    entityManager?: EntityManager
  ): Promise<{ id: string; displayFileName: string; url: string }> {
    const connection = entityManager ?? this.sqlConnection.manager;
    const extension = extname(filename);
    const filenameWithoutExtension = basename(filename, extension);

    const file = await connection.save(InnovationFileLegacyEntity, {
      createdBy: userId,
      displayFileName: filenameWithoutExtension.substring(0, 99 - extension.length) + extension, // failsafe to avoid filename too long (100 chars max)
      innovation: { id: innovationId },
      context
    });

    return {
      id: file.id,
      displayFileName: file.displayFileName,
      url: this.fileStorageService.getUploadUrl(file.id, filename)
    };
  }

  /**
   * gets the files by id
   * @param ids the file identifiers
   * @param entityManager optional entity manager to use for the transaction
   * @returns the files
   */
  async getFilesByIds(ids: undefined | string[], entityManager?: EntityManager): Promise<InnovationFileLegacyEntity[]> {
    if (!ids?.length) {
      return [];
    }

    const connection = entityManager ?? this.sqlConnection.manager;

    return connection
      .createQueryBuilder(InnovationFileLegacyEntity, 'file')
      .where('file.id IN (:...ids)', { ids })
      .getMany();
  }
}
