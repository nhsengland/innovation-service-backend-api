import { inject, injectable } from 'inversify';

import { InnovationActionEntity, InnovationDocumentEntity, InnovationEntity, InnovationFileEntity, InnovationSectionEntity, UserEntity, UserRoleEntity } from '@innovations/shared/entities';
import { ActivityEnum, InnovationActionStatusEnum, InnovationSectionStatusEnum, InnovationStatusEnum, NotifierTypeEnum, ServiceRoleEnum } from '@innovations/shared/enums';
import { InnovationErrorsEnum, InternalServerError, NotFoundError } from '@innovations/shared/errors';
import { DomainServiceSymbol, DomainServiceType, FileStorageServiceSymbol, FileStorageServiceType, IdentityProviderServiceSymbol, IdentityProviderServiceType, NotifierServiceSymbol, NotifierServiceType } from '@innovations/shared/services';
import type { DateISOType } from '@innovations/shared/types/date.types';

import { BaseService } from './base.service';

import { NotImplementedError } from '@innovations/shared/errors/errors.config';
import { CurrentCatalogTypes, CurrentDocumentConfig, CurrentDocumentType, CurrentEvidenceType } from '@innovations/shared/schemas/innovation-record';
import type { DomainContextType } from '@innovations/shared/types';
import { EntityManager, In } from 'typeorm';
import type { InnovationSectionModel } from '../_types/innovation.types';
import { InnovationFileService } from './innovation-file.service';
import { InnovationFileServiceSymbol } from './interfaces';

@injectable()
export class InnovationSectionsService extends BaseService {

  constructor(
    @inject(DomainServiceSymbol) private domainService: DomainServiceType,
    @inject(IdentityProviderServiceSymbol) private identityService: IdentityProviderServiceType,
    @inject(InnovationFileServiceSymbol) private innovationFileService: InnovationFileService,
    @inject(FileStorageServiceSymbol) private fileStorageService: FileStorageServiceType,
    @inject(NotifierServiceSymbol) private notifierService: NotifierServiceType
  ) { super(); }


  async getInnovationSectionsList(
    domainContext: DomainContextType,
    innovationId: string,
    entityManager?: EntityManager
  ): Promise<{
    id: null | string,
    section: CurrentCatalogTypes.InnovationSections,
    status: InnovationSectionStatusEnum,
    submittedAt: null | DateISOType,
    submittedBy: null | {
      name: string,
      isOwner: boolean
    },
    openActionsCount: number
  }[]> {

    const connection = entityManager ?? this.sqlConnection.manager;

    const innovation = await connection.createQueryBuilder(InnovationEntity, 'innovation')
      .select([
        'innovation.id',
        'owner.id',
        'sections.id', 'sections.section', 'sections.status', 'sections.submittedAt',
        'submittedBy.id', 'submittedBy.identityId'
      ])
      .leftJoin('innovation.owner', 'owner')
      .innerJoin('innovation.sections', 'sections')
      .leftJoin('sections.submittedBy', 'submittedBy')
      .where('innovation.id = :innovationId', { innovationId })
      .getOne();
    if (!innovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    const sections = await innovation.sections;

    let openActions: { section: string, actionsCount: number }[] = [];

    if (sections.length > 0) {
      const actionStatus = [ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR, ServiceRoleEnum.ASSESSMENT].includes(domainContext.currentRole.role as ServiceRoleEnum)
        ? InnovationActionStatusEnum.SUBMITTED
        : InnovationActionStatusEnum.REQUESTED;

      const query = connection.createQueryBuilder(InnovationActionEntity, 'actions')
        .select('sections.section', 'section')
        .addSelect('COUNT(actions.id)', 'actionsCount')
        .innerJoin('actions.innovationSection', 'sections')
        .where('sections.innovation_id = :innovationId', { innovationId })
        .andWhere(`sections.id IN (:...sectionIds)`, { sectionIds: sections.map(item => item.id) })
        .andWhere('actions.status = :actionStatus', { actionStatus })
        .groupBy('sections.section');

      switch (domainContext.currentRole.role) {
        case ServiceRoleEnum.ACCESSOR:
        case ServiceRoleEnum.QUALIFYING_ACCESSOR:
          query.innerJoin('actions.innovationSupport', 'supports');
          query.andWhere('supports.organisationUnit = :orgUnitId', { orgUnitId: domainContext.organisation?.organisationUnit?.id });
          break;
        case ServiceRoleEnum.ASSESSMENT:
          query.andWhere('actions.innovationSupport IS NULL');
          break;
        default: // do nothing
      }

      openActions = await query.getRawMany();
    }

    const innovators = sections.map(s => s.submittedBy?.identityId).filter((u): u is string => !!u);
    const innovatorNames = await this.identityService.getUsersMap(innovators);

    return CurrentCatalogTypes.InnovationSections.map(sectionKey => {

      const section = sections.find(item => item.section === sectionKey);

      if (section) {

        const openActionsCount = openActions.find(item => item.section === sectionKey)?.actionsCount ?? 0;

        return {
          id: section.id,
          section: section.section,
          status: section.status,
          submittedAt: section.submittedAt,
          submittedBy: section.submittedBy ? {
            name: innovatorNames.get(section.submittedBy.identityId)?.displayName ?? 'unknown user',
            isOwner: section.submittedBy.id === innovation.owner?.id ?? false
          } : null,
          openActionsCount
        };

      } else {
        return { id: null, section: sectionKey, status: InnovationSectionStatusEnum.NOT_STARTED, submittedAt: null, submittedBy: null, openActionsCount: 0 };
      }

    });

  }


  async getInnovationSectionInfo(
    domainContext: DomainContextType,
    innovationId: string,
    sectionKey: CurrentCatalogTypes.InnovationSections,
    filters: { fields?: ('actions'[]) },
    entityManager?: EntityManager
  ): Promise<{
    id: null | string,
    section: CurrentCatalogTypes.InnovationSections,
    status: InnovationSectionStatusEnum,
    submittedAt: null | DateISOType,
    submittedBy: null | {
      name: string,
      isOwner: boolean,
    },
    data: null | { [key: string]: any },
    actionsIds?: string[]
  }> {

    const connection = entityManager ?? this.sqlConnection.manager;

    const sectionExists = CurrentCatalogTypes.InnovationSections.find(item => item === sectionKey);
    if (!sectionExists) {
      throw new InternalServerError(InnovationErrorsEnum.INNOVATION_SECTIONS_CONFIG_UNAVAILABLE);
    }

    const innovation = await connection.createQueryBuilder(InnovationEntity, 'innovation')
      .leftJoinAndSelect('innovation.owner', 'owner')
      .innerJoinAndSelect('innovation.document', 'document')
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

    const dbSection = await connection.createQueryBuilder(InnovationSectionEntity, 'section')
      .select([
        'section.id', 'section.section', 'section.status', 'section.submittedAt',
        'submittedBy.id', 'submittedBy.identityId'
      ])
      .leftJoin('section.submittedBy', 'submittedBy')
      .where('section.innovation_id = :innovationId', { innovationId })
      .andWhere('section.section = :sectionKey', { sectionKey })
      .getOne();

    let actions: null | InnovationActionEntity[] = null;
    if (filters.fields?.includes('actions')) {
      const requestedStatus = [ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR, ServiceRoleEnum.ASSESSMENT].includes(domainContext.currentRole.role as ServiceRoleEnum)
        ? InnovationActionStatusEnum.SUBMITTED
        : InnovationActionStatusEnum.REQUESTED;

      const actionsQuery = this.sqlConnection.createQueryBuilder(InnovationActionEntity, 'actions')
        .where('actions.innovation_section_id = :sectionId', { sectionId: dbSection?.id })
        .andWhere('actions.status = :requestedStatus', { requestedStatus });

      if (domainContext.currentRole.role === ServiceRoleEnum.ASSESSMENT) {
        actionsQuery.andWhere('actions.innovation_support_id IS NULL');
      } else if (domainContext.currentRole.role === ServiceRoleEnum.ACCESSOR || domainContext.currentRole.role === ServiceRoleEnum.QUALIFYING_ACCESSOR) {
        actionsQuery.andWhere('actions.innovation_support_id IS NOT NULL');
      }

      actions = await actionsQuery.orderBy('actions.updated_at', 'DESC').getMany();
    }

    let submittedBy: null | string;
    // Avoid throwing an error if the user is not found.
    try {
      submittedBy = (dbSection?.submittedBy && (await this.identityService.getUserInfo(dbSection.submittedBy.identityId)).displayName) ?? null;
    } catch (e) {
      submittedBy = null;
    }

    // Business Rule A/QAs can only see submitted sections
    // TODO: this can use history table to retrieve the last submitted section from the document if we choose to present them something they could previously see.
    const sectionHidden =  [ServiceRoleEnum.QUALIFYING_ACCESSOR, ServiceRoleEnum.ACCESSOR].includes(domainContext.currentRole.role) && dbSection?.status !== InnovationSectionStatusEnum.SUBMITTED;
    const sectionData = document[sectionKey];
    
    // Add special information for the EVIDENCE_OF_EFFECTIVENESS section
    const evidenceData = sectionKey !== 'EVIDENCE_OF_EFFECTIVENESS' ?
      undefined :
      document.evidences?.map(evidence => ({
        evidenceSubmitType: evidence.evidenceSubmitType,
        description: evidence.description
      }));
        
    let files: {id: string, name: string, url: string}[] | undefined;
    
    // Add file URLs if needed
    if (sectionData && 'files' in sectionData && sectionData.files?.length) {
      files = (await this.innovationFileService.getFilesByIds(sectionData.files)).map(file => ({
        id: file.id,
        name: file.displayFileName,
        url: this.fileStorageService.getDownloadUrl(file.id, file.displayFileName)
      }));
    }

    return {
      id: dbSection?.id || null,
      section: sectionKey,
      status: dbSection?.status || InnovationSectionStatusEnum.NOT_STARTED,
      submittedAt: dbSection?.submittedAt || null,
      submittedBy: dbSection?.submittedBy ? {
        name: submittedBy ?? 'unknown user',
        isOwner: dbSection.submittedBy.id === innovation.owner.id
      } : null,
      data: !sectionHidden ? {
        ...sectionData,
        ...(files && { files }),
        ...(evidenceData && { evidences: evidenceData })
      } : null,
      ...(filters.fields?.includes('actions') && actions ? { actionsIds: actions?.map(action => (action.id)) } : {})
    };

  }


  async updateInnovationSectionInfo(
    user: { id: string },
    domainContext: DomainContextType,
    innovationId: string,
    sectionKey: CurrentCatalogTypes.InnovationSections,
    dataToUpdate: { [key: string]: any }
  ): Promise<{ id: string | undefined }> {

    const sectionExists = CurrentCatalogTypes.InnovationSections.find(item => item === sectionKey);
    if (!sectionExists) {
      throw new InternalServerError(InnovationErrorsEnum.INNOVATION_SECTIONS_CONFIG_UNAVAILABLE);
    }

    const innovation = await this.sqlConnection.createQueryBuilder(InnovationEntity, 'innovation')
      .where('innovation.id = :innovationId', { innovationId })
      .getOne();

    if (!innovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    // This variable will hold files marked to be deleted, to be removed only inside the transaction.
    let sectionDeletedFiles: InnovationFileEntity[] = [];

    // We always have at most one section per sectionKey, so we can just get the first one.
    let section = await this.sqlConnection.createQueryBuilder(InnovationSectionEntity, 'section')
      .leftJoinAndSelect('section.files', 'sectionFiles')
      .where('section.innovation_id = :innovationId', { innovationId })
      .andWhere('section.section = :sectionKey', { sectionKey })
      .getOne();

    // Verify if activity log should be created, based on the current section.status.
    // BUSINESS RULE: Don't log section updates before innovation submission, only after.
    const shouldAddActivityLog = innovation.status != InnovationStatusEnum.CREATED && !!section && section.status != InnovationSectionStatusEnum.DRAFT;

    // Use the same updatedAt for all entities to ease joins with historyTable
    const updatedAt = new Date().toISOString();

    if (!section) { // Section don't exist yet, let's create it.
      section = InnovationSectionEntity.new({
        section: sectionKey,
        innovation,
        status: InnovationSectionStatusEnum.DRAFT,
        createdBy: user.id,
        updatedBy: user.id,
        updatedAt: updatedAt,
        files: CurrentDocumentConfig.allowFileUploads.has(sectionKey) && dataToUpdate['files'] ? dataToUpdate['files'].map((id: string) => ({ id })) : []
      });
    } else {
      section.updatedBy = user.id;
      section.updatedAt = updatedAt;
      section.status = InnovationSectionStatusEnum.DRAFT;

      if (CurrentDocumentConfig.allowFileUploads.has(sectionKey)) {
        sectionDeletedFiles = section.files.filter(file => !dataToUpdate['files']?.includes(file.id));
        section.files = (dataToUpdate['files'] ?? []).map((id: string) => ({ id }));
      }
    }

    let updateInnovation = false;
    if (sectionKey === 'INNOVATION_DESCRIPTION') {
      (['name', 'description', 'countryName', 'postcode', 'mainCategory', 'otherCategoryDescription'] as const).forEach(key => {
        if (dataToUpdate[key] !== undefined) {
          // This hack for otherCategoryDescription is to be removed in the future, maintaining for compatibility until InnovationEntity is updated.
          innovation[key === 'otherCategoryDescription' ? 'otherMainCategoryDescription' : key] = dataToUpdate[key];
          updateInnovation = true;
        }
      });
    }

    const sectionToBeSaved = section;

    return this.sqlConnection.transaction(async transaction => {
      await transaction.query(`
        UPDATE innovation_document 
        SET document = JSON_MODIFY(document, @0, JSON_QUERY(@1)), updated_by=@2, updated_at=@3, is_snapshot=0, description=NULL WHERE id = @4`,
        [`$.${sectionKey}`, JSON.stringify(dataToUpdate), user.id, updatedAt, innovation.id]
      );

      if(updateInnovation) {
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

      await this.domainService.innovations.deleteInnovationFiles(transaction, sectionDeletedFiles);

      if (shouldAddActivityLog) {
        await this.domainService.innovations.addActivityLog(
          transaction,
          { innovationId: innovation.id, activity: ActivityEnum.SECTION_DRAFT_UPDATE, domainContext },
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

    const dbInnovation = await connection.createQueryBuilder(InnovationEntity, 'innovation')
      .leftJoinAndSelect('innovation.sections', 'sections')
      .where('innovation.id = :innovationId', { innovationId, userId: domainContext.id })
      .andWhere('sections.section = :sectionKey', { sectionKey })
      .getOne();
    if (!dbInnovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    const sections = await dbInnovation.sections;
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

      const now = new Date().toISOString();

      // Update section.
      dbSection.status = InnovationSectionStatusEnum.SUBMITTED;
      dbSection.updatedBy = domainContext.id;
      dbSection.updatedAt = now;
      dbSection.submittedAt = now;
      dbSection.submittedBy = UserEntity.new({ id: domainContext.id });

      // Update section actions.
      const requestedStatusActions = (await dbSection.actions).filter(action => action.status === InnovationActionStatusEnum.REQUESTED);
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
        updatedBy: domainContext.id,
      });

      // Add activity logs.
      if (dbInnovation.status != InnovationStatusEnum.CREATED) {
        // BUSINESS RULE: Don't log section updates before innovation submission, only after.
        await this.domainService.innovations.addActivityLog(
          transaction,
          { innovationId: dbInnovation.id, activity: ActivityEnum.SECTION_SUBMISSION, domainContext },
          { sectionId: savedSection.section }
        );
      }

      if (requestedStatusActions.length > 0) {
        await this.domainService.innovations.addActivityLog(
          transaction,
          { innovationId: dbInnovation.id, activity: ActivityEnum.ACTION_STATUS_SUBMITTED_UPDATE, domainContext },
          { sectionId: savedSection.section, totalActions: requestedStatusActions.length }
        );

        for (const action of requestedStatusActions) {
          await this.notifierService.send(
            { id: domainContext.id, identityId: domainContext.identityId },
            NotifierTypeEnum.ACTION_UPDATE,
            {
              innovationId: dbInnovation.id,
              action: {
                id: action.id,
                section: savedSection.section,
                status: InnovationActionStatusEnum.SUBMITTED
              }
            },
            domainContext,
          );
        }
      }

      return { id: savedSection.id };

    });


  }

  async findAllSections(innovationId: string): Promise<{ innovation: { name: string }, innovationSections: { section: InnovationSectionModel, data: Record<string, any> }[] }> {

    const innovation = await this.sqlConnection.createQueryBuilder(InnovationEntity, 'innovation')
      .leftJoinAndSelect('innovation.sections', 'sections')
      .where('innovation.id = :innovationId', { innovationId })
      .getOne();

    if (!innovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    const sections = new Map((await innovation.sections).map(section => [section.section, section]));
    const innovationSections: { section: InnovationSectionModel, data: Record<string, any> }[] = [];

    // This is just because of typescript (maybe change enums to types later)
    const sectionOptions = CurrentCatalogTypes.InnovationSections;

    const document = await this.sqlConnection.createQueryBuilder(InnovationDocumentEntity, 'document')
      .where('id = :innovationId', { innovationId })
      .getOne();

    if (document?.document.version !== CurrentDocumentConfig.version) {
      // Currently we only support the latest document version.
      // This will soon change with PDF export of older versions.
      throw new NotImplementedError(InnovationErrorsEnum.INNOVATION_DOCUMENT_VERSION_NOT_SUPPORTED);
    }

    for (const key of sectionOptions) {

      const section = sections.get(key);

      if (!section) {
        continue;
      }

      const data = document?.document[key];

      innovationSections.push({
        section: this.getInnovationSectionMetadata(key, section),
        data: data ?? {}
      });

    }

    return {
      innovation: { name: innovation.name },
      innovationSections
    };
  }


  async createInnovationEvidence(
    user: { id: string },
    innovationId: string,
    evidenceData: CurrentEvidenceType,
    entityManager?: EntityManager
  ): Promise<void> {

    const connection = entityManager ?? this.sqlConnection.manager;

    // Check if innovation exists and is of current version (throws error if it doesn't)
    await this.getInnovationDocument(innovationId, connection);

    const section = await this.sqlConnection
      .createQueryBuilder(InnovationSectionEntity, 'section')
      .innerJoin('section.innovation', 'innovation')
      .where('innovation.id = :innovationId', { innovationId: innovationId })
      .andWhere('section.section = :sectionName', { sectionName: 'EVIDENCE_OF_EFFECTIVENESS' })
      .getOne();

    if (!section) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_SECTION_NOT_FOUND);
    }

    return connection.transaction(async (transaction) => {
      const updatedAt = new Date().toISOString();

      const evidence: CurrentEvidenceType = {
        evidenceType: evidenceData.evidenceType,
        evidenceSubmitType: evidenceData.evidenceSubmitType,
        description: evidenceData.description,
        summary: evidenceData.summary,
        files: evidenceData.files
      };
      
      await transaction.query(`
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
    });
  }

  async updateInnovationEvidence(
    user: { id: string },
    innovationId: string,
    evidenceOffset: number,
    evidenceData: CurrentEvidenceType
  ): Promise<void> {

    const document = await this.getInnovationDocument(innovationId);

    const evidence = document.evidences?.[evidenceOffset];

    if (!evidence) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_EVIDENCE_NOT_FOUND);
    }

    const section = await this.sqlConnection
      .createQueryBuilder(InnovationSectionEntity, 'section')
      .innerJoin('section.innovation', 'innovation')
      .where('innovation.id = :innovationId', { innovationId: innovationId })
      .andWhere('section.section = :sectionName', { sectionName: 'EVIDENCE_OF_EFFECTIVENESS' })
      .getOne();

    if (!section) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_SECTION_NOT_FOUND);
    }

    const existingFiles = new Set((await this.innovationFileService.getFilesByIds(evidence.files)).map(f => f.id));
    const filesToDelete = evidenceData.files.filter(f => !existingFiles.has(f));
    
    return this.sqlConnection.transaction(async (transaction) => {

      const updatedAt = new Date().toISOString();

      if(filesToDelete.length > 0) {
        await this.domainService.innovations.deleteInnovationFiles(transaction, filesToDelete);
      }

      const data: CurrentEvidenceType = {
        evidenceType: evidenceData.evidenceType,
        evidenceSubmitType: evidenceData.evidenceSubmitType,
        description: evidenceData.description,
        summary: evidenceData.summary,
        files: evidenceData.files.filter(f => existingFiles.has(f))
      };

      await transaction.query(`
        UPDATE innovation_document 
        SET document = JSON_MODIFY(document, @0, JSON_QUERY(@1)), updated_by=@2, updated_at=@3, is_snapshot=0, description=NULL WHERE id = @4`,
        [`$.evidences[${evidenceOffset}]`, JSON.stringify(data), user.id, updatedAt, innovationId]
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

  async deleteInnovationEvidence(user: { id: string }, innovationId: string, evidenceOffset: number): Promise<void> {

    const document = await this.getInnovationDocument(innovationId);

    let evidences = document.evidences;
    const evidence = evidences?.[evidenceOffset];

    if (!evidences || !evidence) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_EVIDENCE_NOT_FOUND);
    }

    delete evidences[evidenceOffset];
    evidences = evidences.filter(Boolean);

    return this.sqlConnection.transaction(async transaction => {

      const updatedAt = new Date().toISOString();

      if(evidence.files && evidence.files.length > 0) {
        //delete files
        await transaction.delete(InnovationFileEntity, { id: In(evidence.files) });
      }

      // save the new evidences
      await transaction.query(`
        UPDATE innovation_document 
        SET document = JSON_MODIFY(document, @0, JSON_QUERY(@1)), updated_by=@2, updated_at=@3, is_snapshot=0, description=NULL WHERE id = @4`,
        [`$.evidences`, JSON.stringify(evidences), user.id, updatedAt, innovationId]
      );
      
      //update section status to draft
      await transaction.update(
        InnovationSectionEntity,
        { innovation: {id: innovationId}, section: 'EVIDENCE_OF_EFFECTIVENESS' },
        {
          updatedAt: updatedAt,
          updatedBy: user.id,
          status: InnovationSectionStatusEnum.DRAFT
        }
      );
    });

  }

  async getInnovationEvidenceInfo(innovationId: string, evidenceOffset: number): Promise<Omit<CurrentEvidenceType, 'files'> & {
    files: { id: string; name: string; url: string }[];
  }> {

    const document = await this.getInnovationDocument(innovationId);

    const evidence = document.evidences?.[evidenceOffset];

    if (!evidence) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_EVIDENCE_NOT_FOUND);
    }

    const files = await this.innovationFileService.getFilesByIds(evidence.files);

    return {
      evidenceType: evidence.evidenceType,
      evidenceSubmitType: evidence.evidenceSubmitType,
      description: evidence.description,
      summary: evidence.summary,
      files: files.map(file => ({
        id: file.id,
        name: file.displayFileName,
        url: this.fileStorageService.getDownloadUrl(file.id, file.displayFileName)
      }))
    };

  }

  private getInnovationSectionMetadata(key: CurrentCatalogTypes.InnovationSections, section?: InnovationSectionEntity): InnovationSectionModel {

    let result: InnovationSectionModel;

    if (section) {
      result = {
        id: section.id,
        section: section.section,
        status: section.status,
        updatedAt: section.updatedAt,
        submittedAt: section.submittedAt,
        actionStatus: null,
      };
    } else {
      result = {
        id: null,
        section: key,
        status: InnovationSectionStatusEnum.NOT_STARTED,
        updatedAt: null,
        submittedAt: null,
        actionStatus: null,
      };
    }

    return result;
  }

  private async getInnovationDocument(innovationId: string, entityManager?: EntityManager): Promise<CurrentDocumentType> {
    const connection = entityManager ?? this.sqlConnection.manager;
    const document = await connection.createQueryBuilder(InnovationDocumentEntity, 'document')
      .where('document.id = :innovationId', { innovationId })
      .getOne();
    
    if (!document) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    if(document.document.version !== CurrentDocumentConfig.version) {
      throw new NotImplementedError(InnovationErrorsEnum.INNOVATION_DOCUMENT_VERSION_NOT_SUPPORTED);
    }

    return document.document;
  }
}
