import { inject, injectable } from 'inversify';

import {
  InnovationEntity,
  InnovationSectionEntity,
  InnovationTaskEntity,
  UserEntity
} from '@innovations/shared/entities';
import {
  ActivityEnum,
  InnovationFileContextTypeEnum,
  InnovationSectionStatusEnum,
  InnovationStatusEnum,
  InnovationTaskStatusEnum,
  ServiceRoleEnum,
  UserStatusEnum
} from '@innovations/shared/enums';
import { InnovationErrorsEnum, InternalServerError, NotFoundError } from '@innovations/shared/errors';
import type {
  DomainService,
  IdentityProviderService,
  IRSchemaService,
  NotifierService,
  RedisService
} from '@innovations/shared/services';

import { BaseService } from './base.service';

import { TranslationHelper } from '@innovations/shared/helpers';
import type { DocumentType } from '@innovations/shared/schemas/innovation-record';
import {
  CurrentCatalogTypes,
  CurrentDocumentType,
  CurrentEvidenceType
} from '@innovations/shared/schemas/innovation-record';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { DomainContextType } from '@innovations/shared/types';
import { randomUUID } from 'crypto';
import type { EntityManager } from 'typeorm';
import type { InnovationDocumentService } from './innovation-document.service';
import type { InnovationFileService } from './innovation-file.service';
import SYMBOLS from './symbols';

type SectionInfoType = {
  section: CurrentCatalogTypes.InnovationSections;
  status: InnovationSectionStatusEnum;
  submittedAt?: Date;
  submittedBy?: { name: string; displayTag: string };
  openTasksCount: number;
};

@injectable()
export class InnovationSectionsService extends BaseService {
  constructor(
    @inject(SHARED_SYMBOLS.DomainService) private domainService: DomainService,
    @inject(SHARED_SYMBOLS.IdentityProviderService) private identityService: IdentityProviderService,
    @inject(SHARED_SYMBOLS.RedisService) private redisService: RedisService,
    @inject(SHARED_SYMBOLS.IRSchemaService) private irSchemaService: IRSchemaService,
    @inject(SYMBOLS.InnovationFileService) private innovationFileService: InnovationFileService,
    @inject(SYMBOLS.InnovationDocumentService) private innovationDocumentService: InnovationDocumentService,
    @inject(SHARED_SYMBOLS.NotifierService) private notifierService: NotifierService
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
      openTasksCount: number;
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
      .leftJoin('innovation.sections', 'sections')
      .leftJoin('sections.submittedBy', 'submittedBy')
      .where('innovation.id = :innovationId', { innovationId })
      .getOne();
    if (!innovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    const sections = innovation.sections;

    let openTasks: { section: string; tasksCount: number }[] = [];

    if (sections.length > 0 && domainContext.currentRole.role === ServiceRoleEnum.INNOVATOR) {
      const query = connection
        .createQueryBuilder(InnovationTaskEntity, 'tasks')
        .select('sections.section', 'section')
        .addSelect('COUNT(tasks.id)', 'tasksCount')
        .innerJoin('tasks.innovationSection', 'sections')
        .where('sections.innovation_id = :innovationId', { innovationId })
        .andWhere(`sections.id IN (:...sectionIds)`, {
          sectionIds: sections.map(item => item.id)
        })
        .andWhere('tasks.status = :taskStatus', { taskStatus: InnovationTaskStatusEnum.OPEN })
        .groupBy('sections.section');

      openTasks = await query.getRawMany();
    }

    const innovators = sections
      .filter(s => s.submittedBy && s.submittedBy.status !== UserStatusEnum.DELETED)
      .map(s => s.submittedBy?.identityId)
      .filter((u): u is string => !!u);
    const innovatorNames = await this.domainService.users.getUsersMap({ identityIds: innovators }, connection);

    return CurrentCatalogTypes.InnovationSections.map(sectionKey => {
      const section = sections.find(item => item.section === sectionKey);

      if (section) {
        const openTasksCount = openTasks.find(item => item.section === sectionKey)?.tasksCount ?? 0;

        return {
          id: section.id,
          section: section.section,
          status: section.status,
          submittedAt: section.submittedAt,
          submittedBy: section.submittedBy
            ? {
                name: innovatorNames.getDisplayName(section.submittedBy.identityId),
                isOwner: section.submittedBy.id === innovation.owner?.id
              }
            : null,
          openTasksCount: openTasksCount
        };
      } else {
        return {
          id: null,
          section: sectionKey,
          status: InnovationSectionStatusEnum.NOT_STARTED,
          submittedAt: null,
          submittedBy: null,
          openTasksCount: 0
        };
      }
    });
  }

  /**
   * This method could be revised, to use the getSectionsInfoMap (return + data)
   * Change taskIds array, return only a counter that comes from getSectionsInfoMap
   * Create a statistics counter that returns the taskIds ordered for FE to use (only being used on task-details)
   */
  async getInnovationSectionInfo(
    domainContext: DomainContextType,
    innovationId: string,
    sectionKey: CurrentCatalogTypes.InnovationSections,
    filters: { fields?: 'tasks'[] },
    entityManager?: EntityManager
  ): Promise<{
    id: null | string;
    section: CurrentCatalogTypes.InnovationSections;
    status: InnovationSectionStatusEnum;
    submittedAt: null | Date;
    submittedBy: null | { name: string; displayTag: string };
    data: null | { [key: string]: any };
    tasksIds?: string[];
  }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const sectionExists = CurrentCatalogTypes.InnovationSections.find(item => item === sectionKey);
    if (!sectionExists) {
      throw new InternalServerError(InnovationErrorsEnum.INNOVATION_SECTIONS_CONFIG_UNAVAILABLE);
    }

    const innovation = await connection
      .createQueryBuilder(InnovationEntity, 'innovation')
      .leftJoinAndSelect('innovation.owner', 'owner')
      .where('innovation.id = :innovationId', { innovationId })
      .getOne();

    if (!innovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    const document = await this.innovationDocumentService.getInnovationDocument(
      innovationId,
      { type: this.innovationDocumentService.getDocumentTypeAccordingWithRole(domainContext.currentRole.role) },
      connection
    );

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

    let tasks: null | InnovationTaskEntity[] = null;
    if (filters.fields?.includes('tasks')) {
      const tasksQuery = connection
        .createQueryBuilder(InnovationTaskEntity, 'tasks')
        .where('tasks.innovation_section_id = :sectionId', { sectionId: dbSection?.id })
        .andWhere('tasks.status = :requestedStatus', { requestedStatus: InnovationTaskStatusEnum.OPEN });

      tasks = await tasksQuery.orderBy('tasks.updated_at', 'DESC').getMany();
    }

    return {
      id: dbSection?.id ?? null,
      section: sectionKey,
      status: dbSection?.status ?? InnovationSectionStatusEnum.NOT_STARTED,
      submittedAt: dbSection?.submittedAt ?? null,
      submittedBy: dbSection?.submittedBy
        ? {
            name: await this.domainService.users.getDisplayName(
              { identityId: dbSection.submittedBy.identityId },
              ServiceRoleEnum.INNOVATOR
            ),
            displayTag: this.domainService.users.getDisplayTag(ServiceRoleEnum.INNOVATOR, {
              isOwner:
                innovation.owner && dbSection.submittedBy ? innovation.owner.id === dbSection.submittedBy.id : undefined
            })
          }
        : null,
      data: this.getSectionData(document, sectionKey),
      ...(filters.fields?.includes('tasks') && tasks ? { tasksIds: tasks?.map(task => task.id) } : {})
    };
  }

  async updateInnovationSectionInfo(
    domainContext: DomainContextType,
    innovationId: string,
    sectionKey: CurrentCatalogTypes.InnovationSections,
    dataToUpdate: { [key: string]: any },
    entityManager?: EntityManager
  ): Promise<{ id: string | undefined }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const sectionExists = CurrentCatalogTypes.InnovationSections.find(item => item === sectionKey);
    if (!sectionExists) {
      throw new InternalServerError(InnovationErrorsEnum.INNOVATION_SECTIONS_CONFIG_UNAVAILABLE);
    }

    const innovation = await connection
      .createQueryBuilder(InnovationEntity, 'innovation')
      .where('innovation.id = :innovationId', { innovationId })
      .getOne();

    if (!innovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    // We always have at most one section per sectionKey, so we can just get the first one.
    let section = await connection
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

    const sectionToBeSaved = section;

    return connection.transaction(async transaction => {
      // Special case to clear evidences (dataToUpdate type is correct since it was previously validated by joi)
      if (
        sectionKey === 'EVIDENCE_OF_EFFECTIVENESS' &&
        (dataToUpdate as CurrentDocumentType['EVIDENCE_OF_EFFECTIVENESS']).hasEvidence !== 'YES'
      ) {
        await transaction.query(
          `UPDATE innovation_document_draft
          SET document = JSON_MODIFY(JSON_MODIFY(document, '$.evidences', NULL), @0, JSON_QUERY(@1)), updated_by=@2, updated_at=@3 WHERE id = @4`,
          [`$.${sectionKey}`, JSON.stringify(dataToUpdate), domainContext.id, updatedAt, innovation.id]
        );

        // Delete files related with evidences for this innovation
        await this.innovationFileService.deleteFiles(
          domainContext,
          innovationId,
          { contextType: InnovationFileContextTypeEnum.INNOVATION_EVIDENCE },
          transaction
        );
      } else {
        await this.updateDocumentSectionInfo(
          innovation.id,
          sectionKey,
          { dataToUpdate, updatedBy: domainContext.id, updatedAt },
          transaction
        );
      }

      // Make sure to keep name up-to-date accross the innovation
      if (sectionKey === 'INNOVATION_DESCRIPTION' && innovation.name !== dataToUpdate['name']) {
        // Make sure the latest submitted version contains this change as-well
        await transaction.query(
          `UPDATE innovation_document
           SET document = JSON_MODIFY(document, @0, @1), updated_by=@2, updated_at=@3, is_snapshot=0, description=NULL WHERE id = @4`,
          [`$.${sectionKey}.name`, dataToUpdate['name'], domainContext.id, updatedAt, innovationId]
        );

        await transaction.save(InnovationEntity, {
          id: innovation.id,
          name: dataToUpdate['name'],
          updatedBy: innovation.updatedBy,
          updatedAt: updatedAt
        });
        await this.redisService.addToSet('elasticsearch', innovation.id);
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

      const savedSection = await transaction.save(InnovationSectionEntity, dbSection);

      // Only add to activity log and submit section when is not created/archived
      if (![InnovationStatusEnum.CREATED, InnovationStatusEnum.ARCHIVED].includes(dbInnovation.status)) {
        // Submit document section info
        await this.submitDocumentSectionInfo(
          innovationId,
          sectionKey,
          { updatedBy: domainContext.id, updatedAt: now },
          transaction
        );

        await this.domainService.innovations.addActivityLog(
          transaction,
          {
            innovationId: dbInnovation.id,
            activity: ActivityEnum.SECTION_SUBMISSION,
            domainContext
          },
          { sectionId: savedSection.section }
        );

        await this.notifierService.sendNotifyMe(domainContext, dbInnovation.id, 'INNOVATION_RECORD_UPDATED', {
          sections: sectionKey
        });
      }

      return { id: savedSection.id };
    });
  }

  async findAllSections(
    domainContext: DomainContextType,
    innovationId: string,
    version?: DocumentType['version'],
    entityManager?: EntityManager
  ): Promise<{ section: SectionInfoType; data: Record<string, any> }[]> {
    const em = entityManager ?? this.sqlConnection.manager;

    const document = await this.innovationDocumentService.getInnovationDocument(
      innovationId,
      {
        version,
        type: this.innovationDocumentService.getDocumentTypeAccordingWithRole(domainContext.currentRole.role)
      },
      em
    );
    const innovationSections = this.getDocumentSections(document).map(section => ({
      section: { section: section },
      data: this.getSectionData(document, section)
    }));

    const sectionsInfoMap = await this.getSectionsInfoMap(innovationId, [], em);

    const output: Awaited<ReturnType<InnovationSectionsService['findAllSections']>> = [];
    for (const curSection of innovationSections) {
      const sectionInfo = sectionsInfoMap.get(curSection.section.section);
      if (sectionInfo) {
        output.push({
          data: curSection.data,
          section: {
            section: curSection.section.section,
            status: sectionInfo.status,
            submittedAt: sectionInfo.submittedAt,
            submittedBy: sectionInfo.submittedBy,
            openTasksCount: sectionInfo.openTasksCount
          }
        });
      } else {
        output.push({
          data: curSection.data,
          section: {
            section: curSection.section.section,
            status: InnovationSectionStatusEnum.NOT_STARTED,
            openTasksCount: 0
          }
        });
      }
    }

    return output;
  }

  async createInnovationEvidence(
    user: { id: string },
    innovationId: string,
    evidenceData: Omit<CurrentEvidenceType, 'id'>,
    entityManager?: EntityManager
  ): Promise<{ id: string }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    // Check if innovation exists and is of current version (throws error if it doesn't)
    await this.innovationDocumentService.getInnovationDocument(innovationId, { type: 'DRAFT' }, connection);

    const section = await connection
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
        UPDATE innovation_document_draft
        SET document = JSON_MODIFY(document, @0, JSON_QUERY(@1)), updated_by=@2, updated_at=@3 WHERE id = @4`,
        [`append $.evidences`, JSON.stringify(evidence), user.id, updatedAt, innovationId]
      );

      await transaction.update(
        InnovationSectionEntity,
        { id: section.id },
        { status: InnovationSectionStatusEnum.DRAFT, updatedAt: updatedAt, updatedBy: user.id }
      );

      return { id: evidence.id };
    });
  }

  async updateInnovationEvidence(
    user: { id: string },
    innovationId: string,
    evidenceId: string,
    evidenceData: Omit<CurrentEvidenceType, 'id'>
  ): Promise<void> {
    const document = await this.innovationDocumentService.getInnovationDocument(innovationId, { type: 'DRAFT' });

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

      await this.updateDocumentSectionInfo(
        innovationId,
        `evidences[${evidenceIndex}]`,
        { dataToUpdate: data, updatedBy: user.id, updatedAt },
        transaction
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

  async deleteInnovationEvidence(
    domainContext: DomainContextType,
    innovationId: string,
    evidenceId: string
  ): Promise<void> {
    const document = await this.innovationDocumentService.getInnovationDocument(innovationId, { type: 'DRAFT' });

    let evidences = document.evidences;
    const evidence = evidences?.find(e => e.id === evidenceId);

    if (!evidences || !evidence) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_EVIDENCE_NOT_FOUND);
    }

    evidences = evidences.filter(e => e.id !== evidenceId); // Remove evidence from the array

    return this.sqlConnection.transaction(async transaction => {
      const updatedAt = new Date();

      // delete files related with the evidence
      await this.innovationFileService.deleteFiles(domainContext, innovationId, { contextId: evidenceId }, transaction);

      // save the new evidences
      if (evidences) {
        await this.updateDocumentSectionInfo(
          innovationId,
          'evidences',
          { dataToUpdate: evidences, updatedBy: domainContext.id, updatedAt },
          transaction
        );
      }

      //update section status to draft
      await transaction.update(
        InnovationSectionEntity,
        { innovation: { id: innovationId }, section: 'EVIDENCE_OF_EFFECTIVENESS' },
        {
          updatedAt: updatedAt,
          updatedBy: domainContext.id,
          status: InnovationSectionStatusEnum.DRAFT
        }
      );
    });
  }

  async getInnovationEvidenceInfo(
    domainContext: DomainContextType,
    innovationId: string,
    evidenceId: string
  ): Promise<CurrentEvidenceType> {
    const document = await this.innovationDocumentService.getInnovationDocument(innovationId, {
      type: this.innovationDocumentService.getDocumentTypeAccordingWithRole(domainContext.currentRole.role)
    });

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
   * returns the section data from the document adding the custom output format data:
   * - evidences: [{ id, name, summary }]
   * @param document the source document
   * @param sectionKey the section key
   * @returns section data with extra information
   */
  private getSectionData<T extends object & DocumentType, K extends Exclude<keyof T, 'version' | 'evidences'>>(
    document: T,
    sectionKey: K
  ): T[K] & {
    evidences?: {
      id: string;
      name: string;
      summary: CurrentEvidenceType['summary'];
    }[];
  } {
    let evidenceData;

    const sectionData = document[sectionKey];

    // Special case for evidence data
    if (sectionKey === 'EVIDENCE_OF_EFFECTIVENESS' && document.EVIDENCE_OF_EFFECTIVENESS.hasEvidence === 'YES') {
      evidenceData = document.evidences?.map(evidence => ({
        id: evidence.id,
        name: this.getEvidenceName(evidence.evidenceSubmitType, evidence.description),
        summary: evidence.summary
      }));
    }

    return {
      ...sectionData,
      ...(evidenceData && { evidences: evidenceData })
    };
  }

  private async updateDocumentSectionInfo(
    innovationId: string,
    sectionKey: string,
    data: { dataToUpdate: { [key: string]: any } | { [key: string]: any }[]; updatedBy: string; updatedAt?: Date },
    em: EntityManager
  ): Promise<void> {
    const { version } = await this.irSchemaService.getSchema();
    await em.query(
      `UPDATE innovation_document_draft
      SET document = JSON_MODIFY(JSON_MODIFY(document, @0, JSON_QUERY(@1)), '$.version', @2), updated_by=@3, updated_at=@4 WHERE id = @5`,
      [
        `$.${sectionKey}`,
        JSON.stringify(data.dataToUpdate),
        JSON.stringify(version),
        data.updatedBy,
        data.updatedAt ?? new Date(),
        innovationId
      ]
    );
  }

  private async submitDocumentSectionInfo(
    innovationId: string,
    sectionKey: CurrentCatalogTypes.InnovationSections,
    data: { updatedBy: string; updatedAt?: Date; description?: string },
    em: EntityManager
  ): Promise<void> {
    const document = await this.innovationDocumentService.getInnovationDocument(innovationId, { type: 'DRAFT' });

    const draftSection = this.getSectionData(document, sectionKey);
    const entriesToUpdate: { key: string; data: unknown }[] = [{ key: sectionKey, data: draftSection }];
    if (sectionKey === 'EVIDENCE_OF_EFFECTIVENESS') {
      // Get the evidences raw since the ones returned by the getSectionData transforms some fields
      entriesToUpdate.push({ key: 'evidences', data: document.evidences });
    }

    for (const toUpdate of entriesToUpdate) {
      await em.query(
        `UPDATE innovation_document
       SET document = JSON_MODIFY(document, @0, JSON_QUERY(@1)), updated_by=@2, updated_at=@3, is_snapshot=1, description=@4 WHERE id = @5`,
        [
          `$.${toUpdate.key}`,
          JSON.stringify(toUpdate.data),
          data.updatedBy,
          data.updatedAt ?? new Date(),
          data.description ?? `SECTION_SUBMITTED-${sectionKey}`,
          innovationId
        ]
      );
    }
  }

  private async getSectionsInfoMap(
    innovationId: string,
    sectionsKeys?: string[],
    entityManager?: EntityManager
  ): Promise<Map<string, SectionInfoType>> {
    const em = entityManager ?? this.sqlConnection.manager;

    const query = em
      .createQueryBuilder(InnovationSectionEntity, 'section')
      .select([
        'section.id',
        'section.section',
        'section.status',
        'section.submittedAt',
        'submittedBy.id',
        'submittedBy.identityId',
        'submittedBy.status',
        'innovation.id',
        'owner.id',
        'tasks.id'
      ])
      .leftJoin('section.submittedBy', 'submittedBy')
      .innerJoin('section.innovation', 'innovation')
      .leftJoin('innovation.owner', 'owner')
      .leftJoin('section.tasks', 'tasks', 'tasks.status = :taskStatus', { taskStatus: InnovationTaskStatusEnum.OPEN })
      .where('section.innovation_id = :innovationId', { innovationId });

    if (sectionsKeys?.length) {
      query.andWhere('section.section IN (:...sectionsKeys)', { sectionsKeys });
    }

    const sections = await query.getMany();

    const innovators = sections
      .filter(s => s.submittedBy && s.submittedBy.status !== UserStatusEnum.DELETED)
      .map(s => s.submittedBy?.identityId)
      .filter((id): id is string => !!id);
    const users = await this.domainService.users.getUsersMap({ identityIds: innovators }, em);

    return new Map(
      sections.map(s => [
        s.section,
        {
          section: s.section,
          status: s.status,
          ...(s.submittedAt && { submittedAt: s.submittedAt }),
          submittedBy: {
            name: users.getDisplayName(s.submittedBy?.identityId),
            displayTag: this.domainService.users.getDisplayTag(ServiceRoleEnum.INNOVATOR, {
              isOwner: s.innovation.owner && s.submittedBy ? s.innovation.owner.id === s.submittedBy.id : undefined
            })
          },
          openTasksCount: s.tasks.length
        }
      ])
    );
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
