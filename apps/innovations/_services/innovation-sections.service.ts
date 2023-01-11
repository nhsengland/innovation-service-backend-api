import { inject, injectable } from 'inversify';

import { InnovationActionEntity, InnovationEntity, InnovationEvidenceEntity, InnovationFileEntity, InnovationSectionEntity } from '@innovations/shared/entities';
import { ActivityEnum, ClinicalEvidenceTypeCatalogueEnum, EvidenceTypeCatalogueEnum, InnovationActionStatusEnum, InnovationSectionEnum, InnovationSectionStatusEnum, InnovationStatusEnum, NotifierTypeEnum, UserTypeEnum } from '@innovations/shared/enums';
import { InnovationErrorsEnum, InternalServerError, NotFoundError } from '@innovations/shared/errors';
import { DomainServiceSymbol, DomainServiceType, FileStorageServiceSymbol, FileStorageServiceType, NotifierServiceSymbol, NotifierServiceType } from '@innovations/shared/services';
import type { DateISOType } from '@innovations/shared/types/date.types';

import { BaseService } from './base.service';

import type { InnovationSectionModel } from '../_types/innovation.types';
import { INNOVATION_SECTIONS_CONFIG } from '../_config';

@injectable()
export class InnovationSectionsService extends BaseService {

  constructor(
    @inject(DomainServiceSymbol) private domainService: DomainServiceType,
    @inject(FileStorageServiceSymbol) private fileStorageService: FileStorageServiceType,
    @inject(NotifierServiceSymbol) private notifierService: NotifierServiceType
  ) { super(); }


  async getInnovationSectionsList(
    user: { type: UserTypeEnum },
    innovationId: string
  ): Promise<{
    id: null | string,
    section: InnovationSectionEnum,
    status: InnovationSectionStatusEnum,
    submittedAt: null | DateISOType,
    openActionsCount: number
  }[]> {

    const innovation = await this.sqlConnection.createQueryBuilder(InnovationEntity, 'innovation')
      .innerJoinAndSelect('innovation.sections', 'sections')
      .where('innovation.id = :innovationId', { innovationId })
      .getOne();
    if (!innovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    const sections = await innovation.sections;

    let openActions: { section: string, actionsCount: number }[] = [];

    if (sections.length > 0) {
      const query = this.sqlConnection.createQueryBuilder(InnovationActionEntity, 'actions')
        .select('sections.section', 'section')
        .addSelect('COUNT(actions.id)', 'actionsCount')
        .innerJoin('actions.innovationSection', 'sections')
        .where('sections.innovation_id = :innovationId', { innovationId })
        .andWhere(`sections.id IN (:...sectionIds)`, { sectionIds: sections.map(item => item.id) })
        .groupBy('sections.section');

      if (user.type === UserTypeEnum.ACCESSOR) {
        query.andWhere('actions.status = :actionStatus', { actionStatus: InnovationActionStatusEnum.IN_REVIEW });
      } else if (user.type === UserTypeEnum.INNOVATOR) {
        query.andWhere('actions.status = :actionStatus', { actionStatus: InnovationActionStatusEnum.REQUESTED });
      }

      openActions = await query.getRawMany();
    }

    return Object.values(InnovationSectionEnum).map(sectionKey => {

      const section = sections.find(item => item.section === sectionKey);

      if (section) {

        const openActionsCount = openActions.find(item => item.section === sectionKey)?.actionsCount ?? 0;

        return { id: section.id, section: section.section, status: section.status, submittedAt: section.submittedAt, openActionsCount };

      } else {
        return { id: null, section: sectionKey, status: InnovationSectionStatusEnum.NOT_STARTED, submittedAt: null, openActionsCount: 0 };
      }

    });

  }


  async getInnovationSectionInfo(user: { type: UserTypeEnum }, innovationId: string, sectionKey: InnovationSectionEnum, filters: { fields?: ('actions'[]) }): Promise<{
    id: null | string,
    section: InnovationSectionEnum,
    status: InnovationSectionStatusEnum,
    submittedAt: null | DateISOType
    data: null | { [key: string]: any },
    actionsIds?: string[]
  }> {

    const sectionFields = INNOVATION_SECTIONS_CONFIG[sectionKey];
    if (!sectionFields) {
      throw new InternalServerError(InnovationErrorsEnum.INNOVATION_SECTIONS_CONFIG_UNAVAILABLE);
    }

    const innovation = await this.sqlConnection.createQueryBuilder(InnovationEntity, 'innovation')
      .leftJoinAndSelect('innovation.sections', 'sections')
      .leftJoinAndSelect('sections.files', 'sectionFiles')
      .where('innovation.id = :innovationId', { innovationId })
      .getOne();

    if (!innovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    // NOTE: If user has never filled a section, this will be undefined!
    const dbSection = (await innovation.sections).find(item => item.section === sectionKey);


    let sectionData: null | { [key: string]: any } = null;

    // BUSINESS RULE: Accessor's (type) cannot view sections in draft.
    if (user.type !== UserTypeEnum.ACCESSOR || dbSection?.status === InnovationSectionStatusEnum.SUBMITTED) {
      sectionData = await this.parseSectionInformation(
        innovation,
        dbSection?.files,
        {
          fields: sectionFields.innovationFields,
          lookupTables: sectionFields.lookupTables,
          dependencies: sectionFields.innovationDependencies,
          allowFileUploads: sectionFields.allowFileUploads
        }
      )
    }

    let actions: null | InnovationActionEntity[] = null;

    if (filters.fields?.includes('actions')) {
      const requestedStatus = user.type === UserTypeEnum.ACCESSOR ? InnovationActionStatusEnum.IN_REVIEW : InnovationActionStatusEnum.REQUESTED;
      actions = await this.sqlConnection.createQueryBuilder(InnovationActionEntity, 'actions')
        .where('actions.innovation_section_id = :sectionId', { sectionId: dbSection?.id })
        .andWhere('actions.status = :requestedStatus', { requestedStatus })
        .orderBy('actions.updated_at', 'DESC')
        .getMany();
    }

    return {
      id: dbSection?.id || null,
      section: sectionKey,
      status: dbSection?.status || InnovationSectionStatusEnum.NOT_STARTED,
      submittedAt: dbSection?.submittedAt || null,
      data: sectionData,
      ...(filters.fields?.includes('actions') && actions ? { actionsIds: actions?.map(action => (action.id)) } : {})
    };

  }


  async updateInnovationSectionInfo(
    user: { id: string },
    innovationId: string,
    sectionKey: InnovationSectionEnum,
    dataToUpdate: { [key: string]: any }
  ): Promise<{ id: string | undefined }> {

    const sectionConfig = INNOVATION_SECTIONS_CONFIG[sectionKey];
    if (!sectionConfig) {
      throw new InternalServerError(InnovationErrorsEnum.INNOVATION_SECTIONS_CONFIG_UNAVAILABLE);
    }

    const innovation = await this.sqlConnection.createQueryBuilder(InnovationEntity, 'innovation')
      .leftJoinAndSelect('innovation.sections', 'sections')
      .leftJoinAndSelect('sections.files', 'sectionFiles')
      .where('innovation.id = :innovationId AND innovation.owner_id = :userId', { innovationId, userId: user.id })
      .getOne();

    if (!innovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    // Insert / Update section record.
    const sections = await innovation.sections;
    let section = sections.find(item => item.section === sectionKey);

    // This variable will hold files marked to be deleted, to be removed only inside the transaction.
    let sectionDeletedFiles: InnovationFileEntity[] = [];

    // Verify if activity log should be created, based on the current section.status.
    // BUSINESS RULE: Don't log section updates before innovation submission, only after.
    const shouldAddActivityLog = innovation.status != InnovationStatusEnum.CREATED && !!section && section.status != InnovationSectionStatusEnum.DRAFT;

    if (!section) { // Section don't exist yet, let's create it.

      section = InnovationSectionEntity.new({
        section: sectionKey,
        innovation,
        status: InnovationSectionStatusEnum.DRAFT,
        createdBy: user.id,
        updatedBy: user.id,
        files: sectionConfig.allowFileUploads && dataToUpdate['files'] ? dataToUpdate['files'].map((id: string) => ({ id })) : []
      });

      sections.push(section);

    } else {

      section.updatedBy = user.id;
      section.status = InnovationSectionStatusEnum.DRAFT;

      if (sectionConfig.allowFileUploads) {
        sectionDeletedFiles = section.files.filter(file => !dataToUpdate['files'].includes(file.id));
        section.files = dataToUpdate['files'].map((id: string) => ({ id }));
      }

    }

    await this.parseSectionUpdate(
      user,
      innovation,
      {
        fields: sectionConfig.innovationFields,
        lookupTables: sectionConfig.lookupTables,
        dependencies: sectionConfig.innovationDependencies,
        allowFileUploads: sectionConfig.allowFileUploads
      },
      dataToUpdate
    );


    return this.sqlConnection.transaction(async transaction => {

      const savedInnovation = await transaction.save(InnovationEntity, innovation);

      await this.domainService.innovations.deleteInnovationFiles(transaction, sectionDeletedFiles);

      if (shouldAddActivityLog) {
        await this.domainService.innovations.addActivityLog(
          transaction,
          { userId: user.id, innovationId: savedInnovation.id, activity: ActivityEnum.SECTION_DRAFT_UPDATE },
          { sectionId: sectionKey }
        );
      }

      const sections = await savedInnovation.sections;
      const filteredSection = sections.filter(item => item.section === sectionKey).find(_ => true);

      return { id: filteredSection?.id };
    });

  }


  async submitInnovationSection(user: { id: string, identityId: string; type: UserTypeEnum }, innovationId: string, sectionKey: InnovationSectionEnum): Promise<{ id: string }> {

    const dbInnovation = await this.sqlConnection.createQueryBuilder(InnovationEntity, 'innovation')
      .leftJoinAndSelect('innovation.sections', 'sections')
      .where('innovation.id = :innovationId AND innovation.owner_id = :userId', { innovationId, userId: user.id })
      .getOne();
    if (!dbInnovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    const sections = await dbInnovation.sections;
    const dbSection = sections.find(item => item.section === sectionKey);
    if (!dbSection) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_SECTION_NOT_FOUND);
    }
    if (dbSection.status !== InnovationSectionStatusEnum.DRAFT) {
      // TODO: TechDebt #116721 this should be reviewed, as it is not possible to submit a section that is not in draft.
      // throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SECTION_WITH_UNPROCESSABLE_STATUS);
      return { id: dbSection.id };
    }


    return this.sqlConnection.transaction(async transaction => {

      // Update section.
      dbSection.status = InnovationSectionStatusEnum.SUBMITTED;
      dbSection.updatedBy = user.id;
      dbSection.submittedAt = new Date().toISOString();

      // Update section actions.
      const requestedStatusActions = (await dbSection.actions).filter(action => action.status === InnovationActionStatusEnum.REQUESTED);
      for (const action of requestedStatusActions) {
        action.status = InnovationActionStatusEnum.IN_REVIEW;
        action.updatedBy = user.id;
      }

      const savedSection = await transaction.save(InnovationSectionEntity, dbSection);

      // Add activity logs.
      if (dbInnovation.status != InnovationStatusEnum.CREATED) {
        // BUSINESS RULE: Don't log section updates before innovation submission, only after.
        await this.domainService.innovations.addActivityLog(
          transaction,
          { userId: user.id, innovationId: dbInnovation.id, activity: ActivityEnum.SECTION_SUBMISSION },
          { sectionId: savedSection.section }
        );
      }

      if (requestedStatusActions.length > 0) {
        await this.domainService.innovations.addActivityLog(
          transaction,
          { userId: user.id, innovationId: dbInnovation.id, activity: ActivityEnum.ACTION_STATUS_IN_REVIEW_UPDATE },
          { sectionId: savedSection.section, totalActions: requestedStatusActions.length }
        );

        await this.notifierService.send(
          { id: user.id, identityId: user.identityId, type: user.type },
          NotifierTypeEnum.ACTION_UPDATE,
          {
            innovationId: dbInnovation.id,
            action: {
              id: requestedStatusActions[0]!.id,
              section: savedSection.section,
              status: InnovationActionStatusEnum.IN_REVIEW
            }
          });
      }

      return { id: savedSection.id };

    });


  }

  async findAllSections(innovationId: string): Promise<{ innovation: { name: string }, innovationSections: { section: InnovationSectionModel, data: Record<string, string> }[] }> {

    const innovation = await this.sqlConnection.createQueryBuilder(InnovationEntity, 'innovation')
      .leftJoinAndSelect('innovation.sections', 'sections')
      .leftJoinAndSelect('innovation.owner', 'owner')
      .leftJoinAndSelect('sections.files', 'files')
      .where('innovation.id = :innovationId', { innovationId })
      .getOne();

    if (!innovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    const sections = await innovation.sections;
    const innovationSections: { section: InnovationSectionModel, data: Record<string, string> }[] = [];

    for (const key in InnovationSectionEnum) {

      const section = sections.find((sec) => sec.section === key);

      if (!section) {
        continue;
      }

      const sectionFields = INNOVATION_SECTIONS_CONFIG[key as InnovationSectionEnum];

      innovationSections.push({
        section: this.getInnovationSectionMetadata(key, section),
        data: await this.parseSectionInformation(
          innovation,
          section?.files,
          {
            fields: sectionFields.innovationFields,
            lookupTables: sectionFields.lookupTables,
            dependencies: sectionFields.innovationDependencies,
            allowFileUploads: sectionFields.allowFileUploads
          }
        )
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
    evidenceData: {
      evidenceType: EvidenceTypeCatalogueEnum;
      clinicalEvidenceType: ClinicalEvidenceTypeCatalogueEnum;
      description: string;
      summary: string;
      files: string[];
    }
  ): Promise<{ id: string }> {
    const innovation = await this.sqlConnection
      .createQueryBuilder(InnovationEntity, 'innovation')
      .leftJoinAndSelect('innovation.evidences', 'evidences')
      .where('innovation.id = :innovationId', { innovationId })
      .getOne();

    if (!innovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    const evidences = await innovation.evidences;

    const evidence = InnovationEvidenceEntity.new({
      innovation: InnovationEntity.new({ id: innovationId }),
      evidenceType: evidenceData.evidenceType,
      clinicalEvidenceType: evidenceData.clinicalEvidenceType,
      description: evidenceData.description,
      summary: evidenceData.summary,
      files: evidenceData.files.map((id: string) => (InnovationFileEntity.new({ id }))),
      createdBy: user.id,
      updatedBy: user.id
    });

    evidences.push(evidence);

    return this.sqlConnection.transaction(async (transaction) => {
      const savedEvidence = await transaction.save(
        InnovationEvidenceEntity,
        evidence
      );
      return { id: savedEvidence.id };
    });
  }

  async updateInnovationEvidence(
    user: { id: string },
    evidenceId: string,
    evidenceData: {
      evidenceType: EvidenceTypeCatalogueEnum;
      clinicalEvidenceType: ClinicalEvidenceTypeCatalogueEnum;
      description: string;
      summary: string;
      files: string[];
    }
  ): Promise<{ id: string }> {
    
    const evidence = await this.sqlConnection
      .createQueryBuilder(InnovationEvidenceEntity, 'evidence')
      .innerJoinAndSelect('evidence.innovation', 'innovation')
      .where('evidence.id = :evidenceId', { evidenceId })
      .getOne();

    if (!evidence) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_EVIDENCE_NOT_FOUND);
    }

    const section = await this.sqlConnection
        .createQueryBuilder(InnovationSectionEntity, 'section')
        .innerJoin('section.innovation', 'innovation')
        .where('innovation.id = :innovationId', { innovationId: evidence.innovation.id })
        .andWhere('section.section = :sectionName', { sectionName: InnovationSectionEnum.EVIDENCE_OF_EFFECTIVENESS })
        .getOne()
        
    if (!section) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_SECTION_NOT_FOUND)
    }

    return this.sqlConnection.transaction(async (transaction) => {
      await transaction.update(
        InnovationEvidenceEntity,
        { id: evidence.id },
        {
          evidenceType: evidenceData.evidenceType,
          clinicalEvidenceType: evidenceData.clinicalEvidenceType,
          description: evidenceData.description,
          summary: evidenceData.summary,
          files: evidenceData.files.map((id: string) => (InnovationFileEntity.new({ id }))),
          createdBy: user.id,
          updatedBy: user.id
        }
      );

      await transaction.update(
        InnovationSectionEntity,
        { id: section.id },
        { 
          status: InnovationSectionStatusEnum.DRAFT,
          updatedAt: new Date().toISOString(),
          updatedBy: user.id
        }
      ) 

      return { id: evidence.id };
    });
  }

  async getInnovationEvidenceInfo(innovationId: string, evidenceId: string): Promise<{
    id: string,
    evidenceType: EvidenceTypeCatalogueEnum,
    clinicalEvidenceType: ClinicalEvidenceTypeCatalogueEnum,
    description: string,
    summary: string,
    files: { id: string; displayFileName: string; url: string }[];
  }> {

    const evidence = await this.sqlConnection.createQueryBuilder(InnovationEvidenceEntity, 'evidences')
      .leftJoinAndSelect('evidences.files', 'files')
      .where('evidences.innovation_id = :innovationId', { innovationId })
      .andWhere('evidences.id = :evidenceId', { evidenceId })
      .getOne()

    if (!evidence) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_EVIDENCE_NOT_FOUND);
    }

    return {
      id: evidence.id,
      evidenceType: evidence.evidenceType,
      clinicalEvidenceType: evidence.clinicalEvidenceType,
      description: evidence.description,
      summary: evidence.summary,
      files: evidence.files.map(file => ({
        id: file.id,
        displayFileName: file.displayFileName,
        url: this.fileStorageService.getDownloadUrl(file.id, file.displayFileName)
      }))
    };

  }

  private getInnovationSectionMetadata(key: string, section?: InnovationSectionEntity): InnovationSectionModel {

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
        section: InnovationSectionEnum[key as keyof typeof InnovationSectionEnum],
        status: InnovationSectionStatusEnum.NOT_STARTED,
        updatedAt: null,
        submittedAt: null,
        actionStatus: null,
      };
    }

    return result;
  }

  private async parseSectionUpdate(
    user: { id: string },
    entity: { [key: string]: any }, // This variable should hold an TypeORM entity.
    config: {
      fields: string[],
      lookupTables?: undefined | string[],
      dependencies?: undefined | { table: string, fields: string[], lookupTables?: string[] }[]
      allowFileUploads?: undefined | boolean
    },
    dataToUpdate: { [key: string]: any }
  ): Promise<{ [key: string]: any }> {

    // Update record fields (Only the fields sent to update are considered).
    entity['updatedBy'] = user.id;
    config.fields.forEach(key => {
      if (dataToUpdate[key] !== undefined) {
        entity[key] = dataToUpdate[key];
      }
    });


    // Parse Lookup tables information.
    for (const lookupTable of (config.lookupTables || [])) {

      // Jump to next occurrence if field (refering lookup table) is not sent to update.
      if (dataToUpdate[lookupTable] === undefined) {
        continue;
      }

      const lookupEntity: { [key: string]: any }[] = await entity[lookupTable];
      const updatedLookupValues: string[] = dataToUpdate[lookupTable] || [];

      // Mark to be deleted all existing records that are not on "updatedLookupValues".
      // Note: "type" (used on item.type), refers to the column name. All lookup tables should have this structure.
      lookupEntity
        .filter(item => !updatedLookupValues.includes(item['type']))
        .forEach(item => { item['deletedAt'] = new Date(); });

      // Adds new values that don't exist on current entity.
      updatedLookupValues.forEach(item => {
        if (lookupEntity.findIndex((e: { [key: string]: any }) => e['type'] === item) === -1) {
          lookupEntity.push({
            type: item,
            createdBy: user.id,
            updatedBy: user.id,
            createdAt: new Date(),
            deletedAt: null // This is mandatory so that previously (soft) deleted records are considered as new.
          });
        }
      });

    }

    // Parse Dependency tables information.
    for (const configDependency of (config.dependencies || [])) {

      // Jump to next occurrence if dependency is not sent to update.
      if (dataToUpdate[configDependency.table] === undefined) {
        continue;
      }

      const dependencyEntity: { [key: string]: any }[] = await entity[configDependency.table];
      const updatedDependencies: { [key: string]: any }[] = dataToUpdate[configDependency.table];

      // Mark to be deleted all existing records that are not on "updatedDependencyValues".
      dependencyEntity
        .filter(item => !updatedDependencies.some((e: any) => e.id === item['id']))
        .forEach(item => { item['deletedAt'] = new Date(); });


      for (const updatedDependency of updatedDependencies) {

        if (!updatedDependency['id']) { // New dependency entry.

          // This "id" key can arrive "undefined" or "null!
          // As we want to create a new record, the "id" MUST be removed so TypeOrm assume as being a creation.
          if (updatedDependency !== undefined) {
            delete updatedDependency['id'];
          }

          const newEntry: { [key: string]: any } = Object.entries(updatedDependency)
            .filter(([key, _value]) => configDependency.fields.includes(key))
            .reduce((acc, item) => ({ ...acc, [item[0]]: item[1] }), {});
          newEntry['createdBy'] = user.id;
          newEntry['updatedBy'] = user.id;

          dependencyEntity.push(
            await this.parseSectionUpdate(
              user,
              newEntry,
              { fields: configDependency.fields, lookupTables: configDependency.lookupTables },
              updatedDependency
            )
          );

        } else {

          const existingEntry = dependencyEntity.find(item => item['id'] === updatedDependency['id']);
          if (!existingEntry) {
            throw new InternalServerError(InnovationErrorsEnum.INNOVATION_SECTIONS_CONFIG_UNAVAILABLE, { details: { type: 'dependency', value: updatedDependency['id'] } });
          }

          await this.parseSectionUpdate(
            user,
            existingEntry,
            { fields: configDependency.fields, lookupTables: configDependency.lookupTables },
            updatedDependency
          );

        }

      }

    }

    return entity;

  }


  private async parseSectionInformation(
    entity: { [key: string]: any }, // This variable should hold an TypeORM entity.
    sectionFiles: undefined | InnovationFileEntity[],
    config: {
      fields: string[],
      lookupTables?: string[] | undefined,
      dependencies?: {
        table: string;
        fields: string[];
        lookupTables?: string[];
      }[] | undefined
      allowFileUploads?: boolean | undefined
    }
  ): Promise<{ [key: string]: any }> {

    let data: { [key: string]: any } = {};

    // Populate with innovation table fields.
    data = Object.entries(entity)
      .filter(([key, _value]) => config.fields.includes(key as keyof InnovationEntity))
      .reduce((acc, item) => ({ ...acc, [item[0]]: item[1] }), {});

    // Populate with uploaded files (if any).
    if (config.allowFileUploads && sectionFiles) {
      data['files'] = sectionFiles.map(file => ({
        id: file.id,
        displayFileName: file.displayFileName,
        url: this.fileStorageService.getDownloadUrl(file.id, file.displayFileName)
      }));
    }

    // Populate with innovation lookup tables information.
    for (const lookupTable of (config.lookupTables || [])) {

      const lookupEntity: { [key: string]: any }[] = await entity[lookupTable];
      if (Array.isArray(lookupEntity)) {
        data[lookupTable] = lookupEntity.flatMap(item => item['type']); // "type" refers to the column name. All lookup tables should have this structure.
      } else {
        throw new InternalServerError(InnovationErrorsEnum.INNOVATION_SECTIONS_CONFIG_LOOKUP_NOT_ARRAY, { details: { type: 'lookup', value: lookupEntity } });
      }

    }


    for (const configDependency of config.dependencies || []) {

      const dependencyEntity: { [key: string]: any }[] = await entity[configDependency.table];
      if (!Array.isArray(dependencyEntity)) {
        throw new InternalServerError(InnovationErrorsEnum.INNOVATION_SECTIONS_CONFIG_LOOKUP_NOT_ARRAY, { details: { type: 'dependency', value: dependencyEntity } });
      }

      const result: { [key: string]: any }[] = [];

      for (const dependencyTableInfo of dependencyEntity) {

        result.push(
          await this.parseSectionInformation(
            dependencyTableInfo,
            dependencyTableInfo['files'],
            { fields: configDependency.fields, lookupTables: configDependency.lookupTables }
          )
        );

      }

      data[configDependency.table] = result;

    }

    return data;

  }

}
