import { inject, injectable } from 'inversify';
import { basename, extname } from 'path';

import type { EntityManager } from 'typeorm';

import { InnovationFileEntity, InnovationFileLegacyEntity } from '@innovations/shared/entities';
import type { FileStorageService, IdentityProviderService } from '@innovations/shared/services';

import { InnovationFileContextTypeEnum, ServiceRoleEnum, UserStatusEnum } from '@innovations/shared/enums';
import {
  ForbiddenError,
  InnovationErrorsEnum,
  NotFoundError,
  UnprocessableEntityError
} from '@innovations/shared/errors';
import type { PaginationQueryParamsType } from '@innovations/shared/helpers';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { DomainContextType, IdentityUserInfo } from '@innovations/shared/types';
import { randomUUID } from 'crypto';
import { BaseService } from './base.service';

@injectable()
export class InnovationFileService extends BaseService {
  constructor(
    @inject(SHARED_SYMBOLS.FileStorageService) private fileStorageService: FileStorageService,
    @inject(SHARED_SYMBOLS.IdentityProviderService) private identityProviderService: IdentityProviderService
  ) {
    super();
  }

  async getFilesList(
    innovationId: string,
    filters: {
      name?: string;
      uploadedBy?: ServiceRoleEnum[];
      contextTypes?: InnovationFileContextTypeEnum[];
      contextId?: string;
      organisations?: string[];
      dateFilter?: {
        field: 'createdAt';
        startDate?: Date;
        endDate?: Date;
      }[];
    },
    pagination: PaginationQueryParamsType<'name' | 'createdAt' | 'contextType'>,
    entityManager?: EntityManager
  ): Promise<{
    count: number;
    data: {
      id: string;
      storageId: string;
      context: { id: string; type: InnovationFileContextTypeEnum };
      name: string;
      createdAt: Date;
      createdBy: { name: string; role: ServiceRoleEnum; isOwner?: boolean; orgUnitName?: string };
      file: { name: string; size?: number; extension: string; url: string };
    }[];
  }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const query = connection
      .createQueryBuilder(InnovationFileEntity, 'file')
      .select([
        'file.id',
        'file.storageId',
        'file.contextId',
        'file.contextType',
        'file.name',
        'file.createdAt',
        'file.filename',
        'file.filesize',
        'file.extension',
        'createdByUserRole.id',
        'createdByUserRole.role',
        'createdByUser.id',
        'createdByUser.identityId',
        'createdByUser.status',
        'createdByUserOrgUnit.id',
        'createdByUserOrgUnit.name',
        'innovation.id',
        'innovationOwner.id'
      ])
      .innerJoin('file.createdByUserRole', 'createdByUserRole')
      .innerJoin('createdByUserRole.user', 'createdByUser')
      .leftJoin('createdByUserRole.organisationUnit', 'createdByUserOrgUnit')
      .innerJoin('file.innovation', 'innovation')
      .leftJoin('innovation.owner', 'innovationOwner')
      .where('file.innovation_id = :innovationId', { innovationId });

    if (filters.name) {
      query.andWhere('file.name LIKE :fileName', { fileName: `%${filters.name}%` });
    }

    if (filters.uploadedBy && filters.uploadedBy.length > 0) {
      query.andWhere('createdByUserRole.role IN (:...uploadedBy)', { uploadedBy: filters.uploadedBy });
    }

    if (filters.contextTypes) {
      query.andWhere('file.context_type IN (:...contextTypes)', { contextTypes: filters.contextTypes });
    }

    if (filters.contextId) {
      query.andWhere('file.context_id = :contextId', { contextId: filters.contextId });
    }

    if (filters.organisations) {
      query.andWhere('createdByUserRole.organisation_id IN (:...organisations)', {
        organisations: filters.organisations
      });
    }

    if (filters.dateFilter && filters.dateFilter.length > 0) {
      const dateFilterKeyMap = new Map([['createdAt', 'file.createdAt']]);

      for (const dateFilter of filters.dateFilter) {
        const filterKey = dateFilterKeyMap.get(dateFilter.field);

        if (dateFilter.startDate) {
          query.andWhere(`${filterKey} >= :startDate`, {
            startDate: dateFilter.startDate
          });
        }

        if (dateFilter.endDate) {
          // This is needed because default TimeStamp for a DD/MM/YYYY date is 00:00:00
          const beforeDateWithTimestamp = new Date(dateFilter.endDate);
          beforeDateWithTimestamp.setDate(beforeDateWithTimestamp.getDate() + 1);

          query.andWhere(`${filterKey} < :endDate`, {
            endDate: beforeDateWithTimestamp
          });
        }
      }
    }

    // Pagination and ordering.
    query.skip(pagination.skip);
    query.take(pagination.take);

    for (const [key, order] of Object.entries(pagination.order)) {
      let field: string;
      switch (key) {
        case 'name':
          field = 'file.name';
          break;
        case 'createdAt':
          field = 'file.createdAt';
          break;
        case 'contextType':
          field = 'file.contextType';
          break;
        default:
          field = 'file.name';
          break;
      }
      query.addOrderBy(field, order);
    }

    const [files, count] = await query.getManyAndCount();

    if (count === 0) {
      return { count: 0, data: [] };
    }

    const usersIds = files
      .flatMap(file => [
        file.createdByUserRole.user.status !== UserStatusEnum.DELETED
          ? file.createdByUserRole.user.identityId
          : undefined
      ])
      .filter((u): u is string => u !== undefined);
    const usersInfo = await this.identityProviderService.getUsersMap(usersIds);

    return {
      count,
      data: files.map(file => ({
        id: file.id,
        storageId: file.storageId,
        context: { id: file.contextId, type: file.contextType },
        name: file.name,
        createdAt: file.createdAt,
        createdBy: {
          name: usersInfo.get(file.createdByUserRole.user.identityId)?.displayName ?? '[deleted user]',
          role: file.createdByUserRole.role,
          isOwner:
            file.createdByUserRole.role === ServiceRoleEnum.INNOVATOR && file.innovation.owner
              ? file.createdByUserRole.user.id === file.innovation.owner.id
              : undefined,
          orgUnitName:
            (file.createdByUserRole.role === ServiceRoleEnum.ACCESSOR ||
              file.createdByUserRole.role === ServiceRoleEnum.QUALIFYING_ACCESSOR) &&
            file.createdByUserRole.organisationUnit
              ? file.createdByUserRole.organisationUnit.name
              : undefined
        },
        file: {
          name: file.filename,
          size: file.filesize ?? undefined,
          extension: file.extension,
          url: this.fileStorageService.getDownloadUrl(file.id, file.filename, file.storageId)
        }
      }))
    };
  }

  async getFileInfo(
    domainContext: DomainContextType,
    innovationId: string,
    fileId: string,
    entityManager?: EntityManager
  ): Promise<{
    id: string;
    storageId: string;
    context: { id: string; type: InnovationFileContextTypeEnum };
    name: string;
    description?: string;
    createdAt: Date;
    createdBy: { name: string; role: ServiceRoleEnum; isOwner?: boolean; orgUnitName?: string };
    file: { name: string; size?: number; extension: string; url: string };
    canDelete: boolean;
  }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const file = await connection
      .createQueryBuilder(InnovationFileEntity, 'file')
      .select([
        'file.id',
        'file.storageId',
        'file.contextId',
        'file.contextType',
        'file.name',
        'file.description',
        'file.createdAt',
        'file.filename',
        'file.filesize',
        'file.extension',
        'createdByUserRole.id',
        'createdByUserRole.role',
        'createdByUser.id',
        'createdByUser.identityId',
        'createdByUser.status',
        'createdByUserOrgUnit.id',
        'createdByUserOrgUnit.name',
        'innovation.id',
        'innovationOwner.id'
      ])
      .innerJoin('file.createdByUserRole', 'createdByUserRole')
      .innerJoin('createdByUserRole.user', 'createdByUser')
      .leftJoin('createdByUserRole.organisationUnit', 'createdByUserOrgUnit')
      .innerJoin('file.innovation', 'innovation')
      .leftJoin('innovation.owner', 'innovationOwner')
      .where('file.innovation_id = :innovationId', { innovationId })
      .andWhere('file.id = :fileId', { fileId })
      .getOne();

    if (!file) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_FILE_NOT_FOUND);
    }

    let createdByUser: null | IdentityUserInfo = null;
    if (file.createdByUserRole.user.status !== UserStatusEnum.DELETED) {
      createdByUser = await this.identityProviderService.getUserInfo(file.createdByUserRole.user.identityId);
    }

    return {
      id: file.id,
      storageId: file.storageId,
      context: { id: file.contextId, type: file.contextType },
      name: file.name,
      description: file.description ?? undefined,
      createdAt: file.createdAt,
      createdBy: {
        name: createdByUser?.displayName ?? '[deleted user]',
        role: file.createdByUserRole.role,
        isOwner:
          file.createdByUserRole.role === ServiceRoleEnum.INNOVATOR && createdByUser && file.innovation.owner
            ? file.createdByUserRole.user.id === file.innovation.owner.id
            : undefined,
        orgUnitName:
          (file.createdByUserRole.role === ServiceRoleEnum.ACCESSOR ||
            file.createdByUserRole.role === ServiceRoleEnum.QUALIFYING_ACCESSOR) &&
          file.createdByUserRole.organisationUnit
            ? file.createdByUserRole.organisationUnit.name
            : undefined
      },
      file: {
        name: file.filename,
        size: file.filesize ?? undefined,
        extension: file.extension,
        url: this.fileStorageService.getDownloadUrl(file.id, file.filename, file.storageId)
      },
      canDelete: this.canDeleteFile(
        { role: file.createdByUserRole.role, orgUnitId: file.createdByUserRole.organisationUnit?.id },
        { role: domainContext.currentRole.role, orgUnitId: domainContext.organisation?.organisationUnit?.id }
      )
    };
  }

  async createFile(
    domainContext: DomainContextType,
    innovationId: string,
    data: {
      context: { id: string; type: InnovationFileContextTypeEnum };
      name: string;
      description?: string;
      file: {
        id: string;
        name: string;
        size: number;
        extension: string;
      };
    },
    entityManager?: EntityManager
  ): Promise<{ id: string }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    if (
      domainContext.currentRole.role !== ServiceRoleEnum.INNOVATOR &&
      data.context.type === InnovationFileContextTypeEnum.INNOVATION_SECTION
    ) {
      throw new UnprocessableEntityError(
        InnovationErrorsEnum.INNOVATION_FILE_ON_INNOVATION_SECTION_MUST_BE_UPLOADED_BY_INNOVATOR
      );
    }

    const file = await connection.save(
      InnovationFileEntity,
      InnovationFileEntity.verifyType({
        contextId: data.context.id,
        contextType: data.context.type,
        name: data.name,
        description: data.description,
        storageId: data.file.id,
        filename: data.file.name,
        filesize: data.file.size,
        extension: data.file.extension,
        innovation: { id: innovationId },
        createdByUserRole: { id: domainContext.currentRole.id },
        createdBy: domainContext.id,
        updatedBy: domainContext.id
      })
    );

    return { id: file.id };
  }

  async deleteFile(domainContext: DomainContextType, fileId: string, entityManager?: EntityManager): Promise<void> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const file = await connection
      .createQueryBuilder(InnovationFileEntity, 'file')
      .select(['file.id', 'createdByRole.id', 'createdByRole.role', 'createdByUserOrgUnit.id'])
      .innerJoin('file.createdByUserRole', 'createdByRole')
      .leftJoin('createdByRole.organisationUnit', 'createdByUserOrgUnit')
      .where('file.id = :fileId', { fileId })
      .getOne();

    if (!file) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_FILE_NOT_FOUND);
    }

    if (
      !this.canDeleteFile(
        { role: file.createdByUserRole.role, orgUnitId: file.createdByUserRole.organisationUnit?.id },
        { role: domainContext.currentRole.role, orgUnitId: domainContext.organisation?.organisationUnit?.id }
      )
    ) {
      throw new ForbiddenError(InnovationErrorsEnum.INNOVATION_FILE_NO_PERMISSION_TO_DELETE);
    }

    const now = new Date();
    await connection.update(
      InnovationFileEntity,
      {
        id: file.id
      },
      {
        updatedAt: now,
        deletedAt: now,
        updatedBy: domainContext.id
      }
    );
  }

  async getFileUploadUrl(filename: string): Promise<{ id: string; name: string; url: string }> {
    const id = randomUUID();
    return {
      id: id + extname(filename),
      name: filename,
      url: this.fileStorageService.getUploadUrl(id, filename)
    };
  }

  private canDeleteFile(
    createdByRole: { role: ServiceRoleEnum; orgUnitId?: string },
    requestUserRole: { role: ServiceRoleEnum; orgUnitId?: string }
  ): boolean {
    switch (requestUserRole.role) {
      case ServiceRoleEnum.INNOVATOR:
        return createdByRole.role === ServiceRoleEnum.INNOVATOR;
      case ServiceRoleEnum.ASSESSMENT:
        return createdByRole.role === ServiceRoleEnum.ASSESSMENT;
      case ServiceRoleEnum.ACCESSOR:
      case ServiceRoleEnum.QUALIFYING_ACCESSOR:
        return createdByRole.orgUnitId === requestUserRole.orgUnitId;
      default:
        return false;
    }
  }

  /** ---------------- */
  /** BELLOW IS LEGACY */
  /** ---------------- */

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
