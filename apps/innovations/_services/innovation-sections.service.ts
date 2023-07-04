import { inject, injectable } from 'inversify';

import {
  InnovationActionEntity,
  InnovationDocumentEntity,
  InnovationEntity,
  InnovationFileEntity,
  InnovationSectionEntity,
  UserEntity,
  UserRoleEntity
} from '@innovations/shared/entities';
import {
  ActivityEnum,
  InnovationActionStatusEnum,
  InnovationFileContextTypeEnum,
  InnovationSectionStatusEnum,
  InnovationStatusEnum,
  NotifierTypeEnum,
  ServiceRoleEnum,
  UserStatusEnum
} from '@innovations/shared/enums';
import { ConflictError, InnovationErrorsEnum, InternalServerError, NotFoundError } from '@innovations/shared/errors';
import type { DomainService, IdentityProviderService, NotifierService } from '@innovations/shared/services';

import { BaseService } from './base.service';

import { NotImplementedError } from '@innovations/shared/errors/errors.config';
import { TranslationHelper } from '@innovations/shared/helpers';
import type { DocumentType, DocumentTypeFromVersion } from '@innovations/shared/schemas/innovation-record';
import {
  CurrentCatalogTypes,
  CurrentDocumentConfig,
  CurrentDocumentType,
  CurrentEvidenceType
} from '@innovations/shared/schemas/innovation-record';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { DomainContextType } from '@innovations/shared/types';
import { randomUUID } from 'crypto';
import type { EntityManager } from 'typeorm';
import type { InnovationFileService } from './innovation-file.service';
import SYMBOLS from './symbols';

@injectable()
export class InnovationSectionsService extends BaseService {
  constructor(
    @inject(SHARED_SYMBOLS.DomainService) private domainService: DomainService,
    @inject(SHARED_SYMBOLS.IdentityProviderService) private identityService: IdentityProviderService,
    @inject(SHARED_SYMBOLS.NotifierService) private notifierService: NotifierService,
    @inject(SYMBOLS.InnovationFileService) private innovationFileService: InnovationFileService
  ) {
    super();
  }

  async getInnovationSectionsList(
    domainContext: DomainContextType,
    innovationId: string,
    entityManager?: EntityManager
  ): Promise<
    {
      id: null | string;
      section: CurrentCatalogTypes.InnovationSections;
      status: InnovationSectionStatusEnum;
      submittedAt: null | Date;
      submittedBy: null | {
        name: string;
        isOwner?: boolean;
      };
      openActionsCount: number;
    }[]
  > {
    const connection = entityManager ?? this.sqlConnection.manager;

    const innovation = await connection
      .createQueryBuilder(InnovationEntity, 'innovation')
      .select([
        'innovation.id',
        'owner.id',
        'sections.id',
        'sections.section',
        'sections.status',
        'sections.submittedAt',
        'submittedBy.id',
        'submittedBy.identityId',
        'submittedBy.status'
      ])
      .leftJoin('innovation.owner', 'owner')
      .innerJoin('innovation.sections', 'sections')
      .leftJoin('sections.submittedBy', 'submittedBy')
      .where('innovation.id = :innovationId', { innovationId })
      .getOne();
    if (!innovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    const sections = innovation.sections;

    let openActions: { section: string; actionsCount: number }[] = [];

    if (sections.length > 0) {
      const actionStatus = [
        ServiceRoleEnum.ACCESSOR,
        ServiceRoleEnum.QUALIFYING_ACCESSOR,
        ServiceRoleEnum.ASSESSMENT
      ].includes(domainContext.currentRole.role as ServiceRoleEnum)
        ? InnovationActionStatusEnum.SUBMITTED
        : InnovationActionStatusEnum.REQUESTED;

      const query = connection
        .createQueryBuilder(InnovationActionEntity, 'actions')
        .select('sections.section', 'section')
        .addSelect('COUNT(actions.id)', 'actionsCount')
        .innerJoin('actions.innovationSection', 'sections')
        .where('sections.innovation_id = :innovationId', { innovationId })
        .andWhere(`sections.id IN (:...sectionIds)`, {
          sectionIds: sections.map(item => item.id)
        })
        .andWhere('actions.status = :actionStatus', { actionStatus })
        .groupBy('sections.section');

      switch (domainContext.currentRole.role) {
        case ServiceRoleEnum.ACCESSOR:
        case ServiceRoleEnum.QUALIFYING_ACCESSOR:
          query.innerJoin('actions.innovationSupport', 'supports');
          query.andWhere('supports.organisationUnit = :orgUnitId', {
            orgUnitId: domainContext.organisation?.organisationUnit?.id
          });
          break;
        case ServiceRoleEnum.ASSESSMENT:
          query.andWhere('actions.innovationSupport IS NULL');
          break;
        default: // do nothing
      }

      openActions = await query.getRawMany();
    }

    const innovators = sections
      .filter(s => s.submittedBy && s.submittedBy.status !== UserStatusEnum.DELETED)
      .map(s => s.submittedBy?.identityId)
      .filter((u): u is string => !!u);
    const innovatorNames = await this.identityService.getUsersMap(innovators);

    return CurrentCatalogTypes.InnovationSections.map(sectionKey => {
      const section = sections.find(item => item.section === sectionKey);

      if (section) {
        const openActionsCount = openActions.find(item => item.section === sectionKey)?.actionsCount ?? 0;

        const submittedByName = section.submittedBy && innovatorNames.get(section.submittedBy.identityId)?.displayName;

        return {
          id: section.id,
          section: section.section,
          status: section.status,
          submittedAt: section.submittedAt,
          submittedBy: section.submittedBy
            ? {
                name: submittedByName ?? 'unknown user',
                ...(submittedByName && {
                  isOwner: section.submittedBy.id === innovation.owner?.id
                })
              }
            : null,
          openActionsCount
        };
      } else {
        return {
          id: null,
          section: sectionKey,
          status: InnovationSectionStatusEnum.NOT_STARTED,
          submittedAt: null,
          submittedBy: null,
          openActionsCount: 0
        };
      }
    });
  }

  async getInnovationSectionInfo(
    domainContext: DomainContextType,
    innovationId: string,
    sectionKey: CurrentCatalogTypes.InnovationSections,
    filters: { fields?: 'actions'[] },
    entityManager?: EntityManager
  ): Promise<{
    id: null | string;
    section: CurrentCatalogTypes.InnovationSections;
    status: InnovationSectionStatusEnum;
    submittedAt: null | Date;
    submittedBy: null | {
      name: string;
      isOwner?: boolean;
    };
    data: null | { [key: string]: any };
    actionsIds?: string[];
  }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const sectionExists = CurrentCatalogTypes.InnovationSections.find(item => item === sectionKey);
    if (!sectionExists) {
      throw new InternalServerError(InnovationErrorsEnum.INNOVATION_SECTIONS_CONFIG_UNAVAILABLE);
    }

    const innovation = await connection
      .createQueryBuilder(InnovationEntity, 'innovation')
      .leftJoinAndSelect('innovation.owner', 'owner')
      .leftJoinAndSelect('innovation.document', 'document')
      .where('innovation.id = :innovationId', { innovationId })
      .getOne();

    if (!innovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    const document = innovation.document.document;
    if (document.version !== CurrentDocumentConfig.version) {
      // Currently we only support the latest document version.
      // Supporting multiple versions will require selecting the correct sections and fields depending on the version
      throw new NotImplementedError(InnovationErrorsEnum.INNOVATION_DOCUMENT_VERSION_NOT_SUPPORTED);
    }

    const dbSection = await connection
      .createQueryBuilder(InnovationSectionEntity, 'section')
      .select([
        'section.id',
        'section.section',
        'section.status',
        'section.submittedAt',
        'submittedBy.id',
        'submittedBy.identityId',
        'submittedBy.status'
      ])
      .leftJoin('section.submittedBy', 'submittedBy')
      .where('section.innovation_id = :innovationId', { innovationId })
      .andWhere('section.section = :sectionKey', { sectionKey })
      .getOne();

    let actions: null | InnovationActionEntity[] = null;
    if (filters.fields?.includes('actions')) {
      const requestedStatus = [
        ServiceRoleEnum.ACCESSOR,
        ServiceRoleEnum.QUALIFYING_ACCESSOR,
        ServiceRoleEnum.ASSESSMENT
      ].includes(domainContext.currentRole.role as ServiceRoleEnum)
        ? InnovationActionStatusEnum.SUBMITTED
        : InnovationActionStatusEnum.REQUESTED;

      const actionsQuery = this.sqlConnection
        .createQueryBuilder(InnovationActionEntity, 'actions')
        .where('actions.innovation_section_id = :sectionId', { sectionId: dbSection?.id })
        .andWhere('actions.status = :requestedStatus', { requestedStatus });

      if (domainContext.currentRole.role === ServiceRoleEnum.ASSESSMENT) {
        actionsQuery.andWhere('actions.innovation_support_id IS NULL');
      } else if (
        domainContext.currentRole.role === ServiceRoleEnum.ACCESSOR ||
        domainContext.currentRole.role === ServiceRoleEnum.QUALIFYING_ACCESSOR
      ) {
        actionsQuery.andWhere('actions.innovation_support_id IS NOT NULL');
      }

      actions = await actionsQuery.orderBy('actions.updated_at', 'DESC').getMany();
    }

    let submittedBy: null | string;
    // Avoid throwing an error if the user is not found.
    try {
      submittedBy =
        dbSection?.submittedBy && dbSection.submittedBy.status !== UserStatusEnum.DELETED
          ? (await this.identityService.getUserInfo(dbSection.submittedBy.identityId)).displayName
          : null;
    } catch (e) {
      submittedBy = null;
    }

    // Business Rule A/QAs can only see submitted sections
    // TODO: this can use history table to retrieve the last submitted section from the document if we choose to present them something they could previously see.
    const sectionHidden =
      [ServiceRoleEnum.QUALIFYING_ACCESSOR, ServiceRoleEnum.ACCESSOR].includes(domainContext.currentRole.role) &&
      dbSection?.status !== InnovationSectionStatusEnum.SUBMITTED;
    const sectionData = await this.getSectionData(document, sectionKey);

    return {
      id: dbSection?.id || null,
      section: sectionKey,
      status: dbSection?.status || InnovationSectionStatusEnum.NOT_STARTED,
      submittedAt: dbSection?.submittedAt || null,
      submittedBy: dbSection?.submittedBy
        ? {
            name: submittedBy ?? 'unknown user',
            ...(submittedBy && { isOwner: dbSection.submittedBy.id === innovation.owner?.id })
          }
        : null,
      data: !sectionHidden ? sectionData : null,
      ...(filters.fields?.includes('actions') && actions ? { actionsIds: actions?.map(action => action.id) } : {})
    };
  }

  async updateInnovationSectionInfo(
    domainContext: DomainContextType,
    innovationId: string,
    sectionKey: CurrentCatalogTypes.InnovationSections,
    dataToUpdate: { [key: string]: any }
  ): Promise<{ id: string | undefined }> {
    const sectionExists = CurrentCatalogTypes.InnovationSections.find(item => item === sectionKey);
    if (!sectionExists) {
      throw new InternalServerError(InnovationErrorsEnum.INNOVATION_SECTIONS_CONFIG_UNAVAILABLE);
    }

    const innovation = await this.sqlConnection
      .createQueryBuilder(InnovationEntity, 'innovation')
      .where('innovation.id = :innovationId', { innovationId })
      .getOne();

    if (!innovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    // We always have at most one section per sectionKey, so we can just get the first one.
    let section = await this.sqlConnection
      .createQueryBuilder(InnovationSectionEntity, 'section')
      .where('section.innovation_id = :innovationId', { innovationId })
      .andWhere('section.section = :sectionKey', { sectionKey })
      .getOne();

    // Verify if activity log should be created, based on the current section.status.
    // BUSINESS RULE: Don't log section updates before innovation submission, only after.
    const shouldAddActivityLog =
      innovation.status != InnovationStatusEnum.CREATED &&
      !!section &&
      section.status != InnovationSectionStatusEnum.DRAFT;

    // Use the same updatedAt for all entities to ease joins with historyTable
    const updatedAt = new Date();

    if (!section) {
      // Section don't exist yet, let's create it.
      section = InnovationSectionEntity.new({
        innovation,
        section: sectionKey,
        status: InnovationSectionStatusEnum.DRAFT,

        createdBy: domainContext.id,
        updatedAt: updatedAt,
        updatedBy: domainContext.id
      });
    } else {
      section.updatedBy = domainContext.id;
      section.updatedAt = updatedAt;
      section.status = InnovationSectionStatusEnum.DRAFT;
    }

    let updateInnovation = false;
    if (sectionKey === 'INNOVATION_DESCRIPTION') {
      (['name', 'description', 'countryName', 'postcode', 'mainCategory', 'otherCategoryDescription'] as const).forEach(
        key => {
          if (dataToUpdate[key] !== undefined) {
            innovation[key] = dataToUpdate[key];
            updateInnovation = true;
          }
          // If postcode exists it is set after countryName
          if (key === 'countryName') {
            innovation.postcode = null;
          }
        }
      );
    }

    const sectionToBeSaved = section;

    return this.sqlConnection.transaction(async transaction => {
      // Special case to clear evidences (dataToUpdate type is correct since it was previously validated by joi)
      if (
        sectionKey === 'EVIDENCE_OF_EFFECTIVENESS' &&
        (dataToUpdate as CurrentDocumentType['EVIDENCE_OF_EFFECTIVENESS']).hasEvidence !== 'YES'
      ) {
        await transaction.query(
          `UPDATE innovation_document
          SET document = JSON_MODIFY(JSON_MODIFY(document, '$.evidences', NULL), @0, JSON_QUERY(@1)), updated_by=@2, updated_at=@3, is_snapshot=0, description=NULL WHERE id = @4`,
          [`$.${sectionKey}`, JSON.stringify(dataToUpdate), domainContext.id, updatedAt, innovation.id]
        );

        // Delete files related with evidences for this innovation
        const filesToDelete = await transaction
          .createQueryBuilder(InnovationFileEntity, 'file')
          .select(['file.id'])
          .where('file.context_type = :contextType', { contextType: InnovationFileContextTypeEnum.INNOVATION_EVIDENCE })
          .andWhere('file.innovation_id = :innovationId', { innovationId })
          .getMany();
        for (const file of filesToDelete) {
          await this.innovationFileService.deleteFile(domainContext, file.id, transaction);
        }
      } else {
        await transaction.query(
          `UPDATE innovation_document
          SET document = JSON_MODIFY(document, @0, JSON_QUERY(@1)), updated_by=@2, updated_at=@3, is_snapshot=0, description=NULL WHERE id = @4`,
          [`$.${sectionKey}`, JSON.stringify(dataToUpdate), domainContext.id, updatedAt, innovation.id]
        );
      }

      if (updateInnovation) {
        await transaction.save(InnovationEntity, {
          id: innovation.id,
          name: innovation.name,
          description: innovation.description,
          countryName: innovation.countryName,
          postcode: innovation.postcode,
          updatedBy: innovation.updatedBy,
          updatedAt: updatedAt
        });
      }

      sectionToBeSaved.updatedAt = updatedAt;
      sectionToBeSaved.updatedAt = updatedAt;
      const sectionSaved = await transaction.save(InnovationSectionEntity, sectionToBeSaved);

      if (shouldAddActivityLog) {
        await this.domainService.innovations.addActivityLog(
          transaction,
          {
            innovationId: innovation.id,
            activity: ActivityEnum.SECTION_DRAFT_UPDATE,
            domainContext
          },
          { sectionId: sectionKey }
        );
      }

      return { id: sectionSaved.id };
    });
  }

  async submitInnovationSection(
    domainContext: DomainContextType,
    innovationId: string,
    sectionKey: CurrentCatalogTypes.InnovationSections,
    entityManager?: EntityManager
  ): Promise<{ id: string }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const dbInnovation = await connection
      .createQueryBuilder(InnovationEntity, 'innovation')
      .leftJoinAndSelect('innovation.sections', 'sections')
      .where('innovation.id = :innovationId', { innovationId, userId: domainContext.id })
      .andWhere('sections.section = :sectionKey', { sectionKey })
      .getOne();
    if (!dbInnovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    const sections = dbInnovation.sections;
    const dbSection = sections[0]; // it's always the first one, as we only have one section per sectionKey.
    if (!dbSection) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_SECTION_NOT_FOUND);
    }
    if (dbSection.status !== InnovationSectionStatusEnum.DRAFT) {
      // TODO: TechDebt #116721 this should be reviewed, as it is not possible to submit a section that is not in draft.
      // throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SECTION_WITH_UNPROCESSABLE_STATUS);
      return { id: dbSection.id };
    }

    return connection.transaction(async transaction => {
      const now = new Date();

      // Update section.
      dbSection.status = InnovationSectionStatusEnum.SUBMITTED;
      dbSection.updatedBy = domainContext.id;
      dbSection.updatedAt = now;
      dbSection.submittedAt = now;
      dbSection.submittedBy = UserEntity.new({ id: domainContext.id });

      // Update section actions.
      const requestedStatusActions = (await dbSection.actions).filter(
        action => action.status === InnovationActionStatusEnum.REQUESTED
      );
      for (const action of requestedStatusActions) {
        action.status = InnovationActionStatusEnum.SUBMITTED;
        action.updatedBy = domainContext.id;
        action.updatedByUserRole = UserRoleEntity.new({ id: domainContext.currentRole.id });
      }

      const savedSection = await transaction.save(InnovationSectionEntity, dbSection);

      // Update document snapshot
      await transaction.save(InnovationDocumentEntity, {
        id: dbInnovation.id,
        isSnapshot: true,
        description: `SECTION_SUBMITTED-${sectionKey}`,
        updatedAt: now,
        updatedBy: domainContext.id
      });

      // Add activity logs.
      if (dbInnovation.status != InnovationStatusEnum.CREATED) {
        // BUSINESS RULE: Don't log section updates before innovation submission, only after.
        await this.domainService.innovations.addActivityLog(
          transaction,
          {
            innovationId: dbInnovation.id,
            activity: ActivityEnum.SECTION_SUBMISSION,
            domainContext
          },
          { sectionId: savedSection.section }
        );
      }

      if (requestedStatusActions.length > 0) {
        await this.domainService.innovations.addActivityLog(
          transaction,
          {
            innovationId: dbInnovation.id,
            activity: ActivityEnum.ACTION_STATUS_SUBMITTED_UPDATE,
            domainContext
          },
          { sectionId: savedSection.section, totalActions: requestedStatusActions.length }
        );

        for (const action of requestedStatusActions) {
          await this.notifierService.send(domainContext, NotifierTypeEnum.ACTION_UPDATE, {
            innovationId: dbInnovation.id,
            action: {
              id: action.id,
              section: savedSection.section,
              status: InnovationActionStatusEnum.SUBMITTED
            }
          });
        }
      }

      return { id: savedSection.id };
    });
  }

  async findAllSections(
    innovationId: string,
    version?: DocumentType['version']
  ): Promise<{ section: { section: string }; data: Record<string, any> }[]> {
    const document = await this.getInnovationDocument(innovationId, version ?? CurrentDocumentConfig.version);
    const innovationSections = await Promise.all(
      this.getDocumentSections(document).map(async section => ({
        section: { section: section },
        data: await this.getSectionData(document, section)
      }))
    );

    return innovationSections;
  }

  async createInnovationEvidence(
    user: { id: string },
    innovationId: string,
    evidenceData: Omit<CurrentEvidenceType, 'id'>,
    entityManager?: EntityManager
  ): Promise<{ id: string }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    // Check if innovation exists and is of current version (throws error if it doesn't)
    await this.getInnovationDocument(innovationId, CurrentDocumentConfig.version, connection);

    const section = await this.sqlConnection
      .createQueryBuilder(InnovationSectionEntity, 'section')
      .innerJoin('section.innovation', 'innovation')
      .where('innovation.id = :innovationId', { innovationId: innovationId })
      .andWhere('section.section = :sectionName', { sectionName: 'EVIDENCE_OF_EFFECTIVENESS' })
      .getOne();

    if (!section) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_SECTION_NOT_FOUND);
    }

    return connection.transaction(async transaction => {
      const updatedAt = new Date();

      const evidence: CurrentEvidenceType = {
        id: randomUUID(),
        evidenceType: evidenceData.evidenceType,
        evidenceSubmitType: evidenceData.evidenceSubmitType,
        description: evidenceData.description,
        summary: evidenceData.summary
      };

      await transaction.query(
        `
        UPDATE innovation_document
        SET document = JSON_MODIFY(document, @0, JSON_QUERY(@1)), updated_by=@2, updated_at=@3, is_snapshot=0, description=NULL WHERE id = @4`,
        [`append $.evidences`, JSON.stringify(evidence), user.id, updatedAt, innovationId]
      );

      await transaction.update(
        InnovationSectionEntity,
        { id: section.id },
        {
          status: InnovationSectionStatusEnum.DRAFT,
          updatedAt: updatedAt,
          updatedBy: user.id
        }
      );

      return { id: evidence.id };
    });
  }

  async updateInnovationEvidence(
    user: { id: string },
    innovationId: string,
    evidenceId: string,
    evidenceData: CurrentEvidenceType
  ): Promise<void> {
    const document = await this.getInnovationDocument(innovationId, CurrentDocumentConfig.version);

    const evidenceIndex = document.evidences?.findIndex(e => e.id === evidenceId) ?? -1;
    const evidence = document.evidences?.[evidenceIndex];

    if (evidenceIndex === -1 || !evidence) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_EVIDENCE_NOT_FOUND);
    }

    const section = await this.sqlConnection
      .createQueryBuilder(InnovationSectionEntity, 'section')
      .select(['section.id'])
      .where('section.innovation_id = :innovationId', { innovationId: innovationId })
      .andWhere('section.section = :sectionName', { sectionName: 'EVIDENCE_OF_EFFECTIVENESS' })
      .getOne();
    if (!section) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_SECTION_NOT_FOUND);
    }

    return this.sqlConnection.transaction(async transaction => {
      const updatedAt = new Date();

      const data: CurrentEvidenceType = {
        id: evidenceId,
        evidenceType: evidenceData.evidenceType,
        evidenceSubmitType: evidenceData.evidenceSubmitType,
        description: evidenceData.description,
        summary: evidenceData.summary
      };

      await transaction.query(
        `
        UPDATE innovation_document
        SET document = JSON_MODIFY(document, @0, JSON_QUERY(@1)), updated_by=@2, updated_at=@3, is_snapshot=0, description=NULL WHERE id = @4`,
        [`$.evidences[${evidenceIndex}]`, JSON.stringify(data), user.id, updatedAt, innovationId]
      );

      await transaction.update(
        InnovationSectionEntity,
        { id: section.id },
        {
          status: InnovationSectionStatusEnum.DRAFT,
          updatedAt: updatedAt,
          updatedBy: user.id
        }
      );
    });
  }

  async deleteInnovationEvidence(user: { id: string }, innovationId: string, evidenceId: string): Promise<void> {
    const document = await this.getInnovationDocument(innovationId, CurrentDocumentConfig.version);

    let evidences = document.evidences;
    const evidence = evidences?.find(e => e.id === evidenceId);

    if (!evidences || !evidence) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_EVIDENCE_NOT_FOUND);
    }

    evidences = evidences.filter(e => e.id !== evidenceId); // Remove evidence from the array

    return this.sqlConnection.transaction(async transaction => {
      const updatedAt = new Date();

      // save the new evidences
      await transaction.query(
        `
        UPDATE innovation_document
        SET document = JSON_MODIFY(document, @0, JSON_QUERY(@1)), updated_by=@2, updated_at=@3, is_snapshot=0, description=NULL WHERE id = @4`,
        [`$.evidences`, JSON.stringify(evidences), user.id, updatedAt, innovationId]
      );

      //update section status to draft
      await transaction.update(
        InnovationSectionEntity,
        { innovation: { id: innovationId }, section: 'EVIDENCE_OF_EFFECTIVENESS' },
        {
          updatedAt: updatedAt,
          updatedBy: user.id,
          status: InnovationSectionStatusEnum.DRAFT
        }
      );
    });
  }

  async getInnovationEvidenceInfo(innovationId: string, evidenceId: string): Promise<CurrentEvidenceType> {
    const document = await this.getInnovationDocument(innovationId, CurrentDocumentConfig.version);

    const evidence = document.evidences?.find(e => e.id === evidenceId);
    if (!evidence) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_EVIDENCE_NOT_FOUND);
    }

    return {
      id: evidence.id,
      evidenceType: evidence.evidenceType,
      evidenceSubmitType: evidence.evidenceSubmitType,
      description: evidence.description,
      summary: evidence.summary
    };
  }

  /**
   * retrieves the latest version of a document from the database and validates the version
   * @param innovationId the innovation id
   * @param version version of the document to retrieve
   * @param entityManager optional entity manager for running inside transaction
   * @returns the document
   */
  private async getInnovationDocument<V extends DocumentType['version'], T extends DocumentTypeFromVersion<V>>(
    innovationId: string,
    version: V,
    entityManager?: EntityManager
  ): Promise<T> {
    const connection = entityManager ?? this.sqlConnection.manager;
    let document: DocumentType | undefined;

    if (version === CurrentDocumentConfig.version) {
      document = (
        await connection
          .createQueryBuilder(InnovationDocumentEntity, 'document')
          .where('document.id = :innovationId', { innovationId })
          .andWhere('document.version = :version', { version })
          .getOne()
      )?.document;
    } else {
      const raw = await connection.query(
        `
        SELECT TOP 1 document FROM innovation_document
        FOR SYSTEM_TIME ALL
        WHERE id = @0
        AND version = @1
        ORDER BY valid_to DESC
      `,
        [innovationId, version]
      );

      document = raw.length ? JSON.parse(raw[0].document) : undefined;
    }

    if (!document) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    if (document.version !== version) {
      throw new ConflictError(InnovationErrorsEnum.INNOVATION_DOCUMENT_VERSION_MISMATCH);
    }

    return document as T;
  }

  /**
   * returns the section data from the document adding the custom output format data:
   * - evidences: [{ id, name, summary }]
   * @param document the source document
   * @param sectionKey the section key
   * @returns section data with extra information
   */
  private async getSectionData<T extends object & DocumentType, K extends Exclude<keyof T, 'version' | 'evidences'>>(
    document: T,
    sectionKey: K
  ): Promise<
    T[K] & {
      evidences?: {
        id: string;
        name: string;
        summary: CurrentEvidenceType['summary'];
      }[];
    }
  > {
    let evidenceData;

    // Special case for evidence data
    if (document.version === '202304') {
      evidenceData =
        sectionKey !== 'EVIDENCE_OF_EFFECTIVENESS'
          ? undefined
          : document.evidences?.map(evidence => ({
              id: evidence.id,
              name: this.getEvidenceName(evidence.evidenceSubmitType, evidence.description),
              summary: evidence.summary
            }));
    }
    const sectionData = document[sectionKey];

    return {
      ...sectionData,
      ...(evidenceData && { evidences: evidenceData })
    };
  }

  private getDocumentSections<T extends DocumentType>(document: T): Exclude<keyof T, 'version' | 'evidences'>[] {
    const sections = Object.keys(document) as (keyof T)[];
    return sections.filter(section => section !== 'version' && section !== 'evidences') as Exclude<
      keyof T,
      'version' | 'evidences'
    >[];
  }

  private getEvidenceName(evidenceSubmitType: CurrentEvidenceType['evidenceSubmitType'], description?: string): string {
    return description ?? TranslationHelper.translate(`EVIDENCE_SUBMIT_TYPES.${evidenceSubmitType}`);
  }
}
