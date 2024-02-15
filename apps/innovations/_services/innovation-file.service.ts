import { inject, injectable } from 'inversify';
import { basename, extname } from 'path';

import { randomUUID } from 'crypto';
import { Brackets, type EntityManager } from 'typeorm';

import { MAX_FILES_ALLOWED } from '@innovations/shared/constants';
import {
  InnovationDocumentEntity,
  InnovationFileEntity,
  InnovationThreadMessageEntity
} from '@innovations/shared/entities';
import {
  InnovationFileContextTypeEnum,
  InnovationStatusEnum,
  NotifierTypeEnum,
  ServiceRoleEnum,
  UserStatusEnum
} from '@innovations/shared/enums';
import {
  ConflictError,
  ForbiddenError,
  InnovationErrorsEnum,
  NotFoundError,
  UnprocessableEntityError
} from '@innovations/shared/errors';
import { TranslationHelper, type PaginationQueryParamsType } from '@innovations/shared/helpers';
import { CurrentDocumentConfig } from '@innovations/shared/schemas/innovation-record';
import { allowFileUploads } from '@innovations/shared/schemas/innovation-record/202304/document.config';
import type { DocumentType202304 } from '@innovations/shared/schemas/innovation-record/202304/document.types';
import type { FileStorageService, IdentityProviderService, NotifierService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import {
  isAccessorDomainContextType,
  isAssessmentDomainContextType,
  type DomainContextType,
  type IdentityUserInfo
} from '@innovations/shared/types';

import { AuthErrorsEnum } from '@innovations/shared/services/auth/authorization-validation.model';
import type {
  InnovationFileOutputContextType,
  InnovationFileOutputType,
  InnovationFileTypeWithContext
} from '../_types/innovation.types';
import { BaseService } from './base.service';

@injectable()
export class InnovationFileService extends BaseService {
  constructor(
    @inject(SHARED_SYMBOLS.FileStorageService) private fileStorageService: FileStorageService,
    @inject(SHARED_SYMBOLS.IdentityProviderService) private identityProviderService: IdentityProviderService,
    @inject(SHARED_SYMBOLS.NotifierService) private notifierService: NotifierService
  ) {
    super();
  }

  async getFilesList(
    domainContext: DomainContextType,
    innovationId: string,
    filters: {
      name?: string;
      uploadedBy?: ServiceRoleEnum[];
      contextTypes?: InnovationFileContextTypeEnum[];
      contextId?: string;
      units?: string[];
      dateFilter?: {
        field: 'createdAt';
        startDate?: Date;
        endDate?: Date;
      }[];
      fields?: 'description'[];
    },
    pagination: PaginationQueryParamsType<'name' | 'createdAt' | 'contextType'>,
    entityManager?: EntityManager
  ): Promise<{
    count: number;
    data: {
      id: string;
      storageId: string;
      context: InnovationFileOutputContextType;
      name: string;
      description?: string;
      createdAt: Date;
      createdBy: { name: string; role: ServiceRoleEnum; isOwner?: boolean; orgUnitName?: string };
      file: InnovationFileOutputType;
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

    if (filters.units) {
      query.andWhere('createdByUserOrgUnit.id IN (:...units)', {
        units: filters.units
      });
    }

    if (filters.dateFilter && filters.dateFilter.length > 0) {
      const dateFilterKeyMap = new Map([['createdAt', 'file.created_at']]);

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

    // A/QA/NA cannot see files uploaded after the innovation is archived
    if (isAccessorDomainContextType(domainContext) || isAssessmentDomainContextType(domainContext)) {
      query.andWhere(
        new Brackets(qb => {
          qb.where('innovation.status <> :archivedStatus', { archivedStatus: InnovationStatusEnum.ARCHIVED }).orWhere(
            'file.createdAt < innovation.statusUpdatedAt'
          );
        })
      );
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

    const contextMap = await this.files2ResolvedContexts(files, innovationId, connection);

    return {
      count,
      data: files.map(file => ({
        id: file.id,
        storageId: file.storageId,
        // The context map will surely have all the context types and ids but adding a failsafe just in case
        context: contextMap.get(this.contextTypeId2Key(file.contextType, file.contextId)) ?? {
          type: file.contextType as any,
          id: file.contextId
        },
        name: file.name,
        ...(filters.fields?.includes('description') && { description: file.description ?? undefined }),
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
          url: this.fileStorageService.getDownloadUrl(file.storageId, file.filename)
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
    context: InnovationFileOutputContextType;
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
        'innovationOwner.id',
        'innovation.status'
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

    const [fileContext] = await this.contextMapper[file.contextType]([file.contextId], innovationId, connection);

    return {
      id: file.id,
      storageId: file.storageId,
      context: fileContext ?? { type: file.contextType as any, id: file.contextId }, // this should never happen
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
        url: this.fileStorageService.getDownloadUrl(file.storageId, file.filename)
      },
      canDelete: this.canDeleteFile(
        { role: file.createdByUserRole.role, orgUnitId: file.createdByUserRole.organisationUnit?.id },
        { role: domainContext.currentRole.role, orgUnitId: domainContext.organisation?.organisationUnit?.id },
        file.innovation.status,
        file.contextType
      )
    };
  }

  async createFile(
    domainContext: DomainContextType,
    innovationId: string,
    data: InnovationFileTypeWithContext,
    innovationStatus?: InnovationStatusEnum,
    entityManager?: EntityManager
  ): Promise<{ id: string }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    if (
      innovationStatus === InnovationStatusEnum.CREATED &&
      data.context.type === InnovationFileContextTypeEnum.INNOVATION_SECTION &&
      !allowFileUploads.has(data.context.id as keyof DocumentType202304)
    ) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_FILE_FORBIDDEN_SECTION);
    }

    if (domainContext.currentRole.role !== ServiceRoleEnum.INNOVATOR) {
      if (data.context.type === InnovationFileContextTypeEnum.INNOVATION_SECTION) {
        throw new UnprocessableEntityError(
          InnovationErrorsEnum.INNOVATION_FILE_ON_INNOVATION_SECTION_MUST_BE_UPLOADED_BY_INNOVATOR
        );
      }
      if (data.context.type === InnovationFileContextTypeEnum.INNOVATION_EVIDENCE) {
        throw new UnprocessableEntityError(
          InnovationErrorsEnum.INNOVATION_FILE_ON_INNOVATION_EVIDENCE_MUST_BE_UPLOADED_BY_INNOVATOR
        );
      }
    }

    // Check if the innovation is archived and the file is not an innovation section before upload (other roles are checked in the auth but innovator was whitelisted)
    if (
      domainContext.currentRole.role === ServiceRoleEnum.INNOVATOR &&
      innovationStatus === InnovationStatusEnum.ARCHIVED &&
      ![InnovationFileContextTypeEnum.INNOVATION_SECTION, InnovationFileContextTypeEnum.INNOVATION_EVIDENCE].includes(
        data.context.type
      )
    ) {
      throw new ConflictError(AuthErrorsEnum.AUTH_INNOVATION_ARCHIVED_CONFLICT);
    }

    const nFiles = await connection
      .createQueryBuilder(InnovationFileEntity, 'file')
      .where('file.innovation_id = :innovationId', { innovationId })
      .getCount();

    if (nFiles >= MAX_FILES_ALLOWED) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_MAX_ALLOWED_FILES_REACHED);
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

    if (
      data.context.type === InnovationFileContextTypeEnum.INNOVATION &&
      domainContext.currentRole.role !== ServiceRoleEnum.INNOVATOR
    ) {
      await this.notifierService.send(domainContext, NotifierTypeEnum.INNOVATION_DOCUMENT_UPLOADED, {
        innovationId,
        file: { id: file.id }
      });
    }

    return { id: file.id };
  }

  async deleteFiles(
    domainContext: DomainContextType,
    innovationId: string,
    filters: { contextType?: InnovationFileContextTypeEnum; contextId?: string },
    entityManager: EntityManager
  ): Promise<void> {
    const query = entityManager
      .createQueryBuilder(InnovationFileEntity, 'file')
      .select(['file.id'])
      .where('file.innovation_id = :innovationId', { innovationId });

    if (filters.contextType) {
      query.andWhere('file.context_type = :contextType', { contextType: filters.contextType });
    }

    if (filters.contextId) {
      query.andWhere('file.context_id = :contextId', { contextId: filters.contextId });
    }

    const files = await query.getMany();
    for (const file of files) {
      await this.deleteFile(domainContext, file.id, entityManager);
    }
  }

  async deleteFile(domainContext: DomainContextType, fileId: string, entityManager?: EntityManager): Promise<void> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const file = await connection
      .createQueryBuilder(InnovationFileEntity, 'file')
      .select([
        'file.id',
        'file.storageId',
        'file.contextType',
        'createdByRole.id',
        'createdByRole.role',
        'createdByUserOrgUnit.id',
        'innovation.status'
      ])
      .innerJoin('file.createdByUserRole', 'createdByRole')
      .innerJoin('file.innovation', 'innovation')
      .leftJoin('createdByRole.organisationUnit', 'createdByUserOrgUnit')
      .where('file.id = :fileId', { fileId })
      .getOne();

    if (!file) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_FILE_NOT_FOUND);
    }

    if (
      !this.canDeleteFile(
        { role: file.createdByUserRole.role, orgUnitId: file.createdByUserRole.organisationUnit?.id },
        { role: domainContext.currentRole.role, orgUnitId: domainContext.organisation?.organisationUnit?.id },
        file.innovation.status,
        file.contextType
      )
    ) {
      throw new ForbiddenError(InnovationErrorsEnum.INNOVATION_FILE_NO_PERMISSION_TO_DELETE);
    }

    // Delete file from blob
    await this.fileStorageService.deleteFile(file.storageId);

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
    const extension = extname(filename);
    const filenameWithoutExtension = basename(filename, extension);
    // We must ensure that the filename gets capped to 100 characters, including the extension.
    if (filename.length > 100) {
      filename = filenameWithoutExtension.substring(0, 100 - extension.length) + extension;
    }
    const storageId = randomUUID() + extension;
    return {
      id: storageId,
      name: filename,
      url: this.fileStorageService.getUploadUrl(storageId, filename)
    };
  }

  private canDeleteFile(
    createdByRole: { role: ServiceRoleEnum; orgUnitId?: string },
    requestUserRole: { role: ServiceRoleEnum; orgUnitId?: string },
    status: InnovationStatusEnum,
    type: InnovationFileContextTypeEnum
  ): boolean {
    if (status === InnovationStatusEnum.ARCHIVED && requestUserRole.role !== ServiceRoleEnum.INNOVATOR) {
      return false;
    }

    switch (requestUserRole.role) {
      case ServiceRoleEnum.INNOVATOR:
        // Check if the innovation is archived and the file is not an innovation section before delete (other roles are checked in the auth but innovator was whitelisted)
        if (
          status === InnovationStatusEnum.ARCHIVED &&
          ![
            InnovationFileContextTypeEnum.INNOVATION_SECTION,
            InnovationFileContextTypeEnum.INNOVATION_EVIDENCE
          ].includes(type)
        ) {
          return false;
        }
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

  /**
   * This function resolves the different file types and returns a map of contextType:contextId -> context output
   * specific for each file type.
   *
   * @param files the document files
   * @param innovationId the innovation id
   * @param entityManager the entity manager
   * @returns a map of contextType:contextId -> context output for each file
   */
  private async files2ResolvedContexts(
    files: { id: string; contextType: InnovationFileContextTypeEnum; contextId: string }[],
    innovationId: string,
    entityManager: EntityManager
  ): Promise<Map<string, InnovationFileOutputContextType>> {
    const contextTypeIDsMap = files.reduce((acc, file) => {
      if (!acc.has(file.contextType)) {
        acc.set(file.contextType, new Set<string>());
      }
      acc.get(file.contextType)?.add(file.contextId);
      return acc;
    }, new Map<InnovationFileContextTypeEnum, Set<string>>());

    // This is a map of contextType:contextId -> context output
    const res = new Map<string, InnovationFileOutputContextType>();

    for (const [type, ids] of contextTypeIDsMap.entries()) {
      const resolved = await this.contextMapper[type]([...ids], innovationId, entityManager);
      resolved.forEach(ct => res.set(this.contextTypeId2Key(type, ct.id), ct));
    }
    return res;
  }

  // Helper mapper function for each file types
  private defaultContextMapper =
    <T extends InnovationFileContextTypeEnum>(contextType: T) =>
    (ids: string[], _innovationId: string, _entityManager: EntityManager) => {
      return ids.map(id => ({ id, type: contextType }));
    };

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  private evidenceContextMapper = async (ids: string[], innovationId: string, entityManager: EntityManager) => {
    const innovationDocument = await entityManager
      .createQueryBuilder(InnovationDocumentEntity, 'document')
      .where('document.id = :innovationId', { innovationId })
      .andWhere('document.version = :version', { version: CurrentDocumentConfig.version })
      .getOne();

    if (!innovationDocument || innovationDocument.document.version !== CurrentDocumentConfig.version) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    const evidenceMap = new Map(
      (innovationDocument.document.evidences ?? []).map(e => [
        e.id,
        e.description ?? TranslationHelper.translate(`EVIDENCE_SUBMIT_TYPES.${e.evidenceSubmitType}`)
      ])
    );

    return ids.map(id => ({
      id: id,
      type: InnovationFileContextTypeEnum.INNOVATION_EVIDENCE as const,
      name: evidenceMap.get(id) ?? '' // this should never be undefined since all evidence files must have an evidence (not throwing error though )
    }));
  };

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  private messageContextMapper = async (ids: string[], _innovationId: string, entityManager: EntityManager) => {
    const messagesMap = new Map(
      (
        await entityManager
          .createQueryBuilder(InnovationThreadMessageEntity, 'message')
          .select(['message.id', 'thread.id', 'thread.subject'])
          .innerJoin('message.thread', 'thread')
          .where('message.id IN (:...ids)', { ids })
          .getMany()
      ).map(m => [m.id, { threadId: m.thread.id, name: m.thread.subject }])
    );

    return ids.map(id => ({
      id,
      type: InnovationFileContextTypeEnum.INNOVATION_MESSAGE as const,
      name: messagesMap.get(id)?.name ?? '', // this should never be undefined since all message files must have a message (not throwing error though )
      threadId: messagesMap.get(id)?.threadId ?? ''
    }));
  };

  private contextTypeId2Key = (type: InnovationFileContextTypeEnum, id: string): string => `${type}:${id}`;

  // Helper mapper for each file types to map the contextType and contextId -> context output
  contextMapper = {
    [InnovationFileContextTypeEnum.INNOVATION]: this.defaultContextMapper(InnovationFileContextTypeEnum.INNOVATION),
    [InnovationFileContextTypeEnum.INNOVATION_PROGRESS_UPDATE]: this.defaultContextMapper(
      InnovationFileContextTypeEnum.INNOVATION_PROGRESS_UPDATE
    ),
    [InnovationFileContextTypeEnum.INNOVATION_SECTION]: this.defaultContextMapper(
      InnovationFileContextTypeEnum.INNOVATION_SECTION
    ),
    [InnovationFileContextTypeEnum.INNOVATION_EVIDENCE]: this.evidenceContextMapper,
    [InnovationFileContextTypeEnum.INNOVATION_MESSAGE]: this.messageContextMapper
  };
}
