import { inject, injectable } from 'inversify';

import {
  InnovationAssessmentEntity,
  InnovationEntity,
  InnovationReassessmentRequestEntity,
  InnovationTaskEntity,
  InnovationThreadEntity,
  OrganisationEntity,
  OrganisationUnitEntity,
  UserEntity
} from '@innovations/shared/entities';
import {
  ActivityEnum,
  InnovationStatusEnum,
  InnovationSupportLogTypeEnum,
  InnovationSupportStatusEnum,
  InnovationTaskStatusEnum,
  MaturityLevelCatalogueType,
  NotifierTypeEnum,
  ServiceRoleEnum,
  ThreadContextTypeEnum,
  YesPartiallyNoCatalogueType
} from '@innovations/shared/enums';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  InnovationErrorsEnum,
  NotFoundError,
  UnprocessableEntityError,
  UserErrorsEnum
} from '@innovations/shared/errors';
import type { DomainService, IRSchemaService, NotifierService } from '@innovations/shared/services';
import type { DomainContextType, InnovationAssessmentKPIExemptionType } from '@innovations/shared/types';

import { InnovationHelper } from '../_helpers/innovation.helper';
import type { InnovationAssessmentType, ReassessmentType } from '../_types/innovation.types';

import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import { omit } from 'lodash';
import type { EntityManager } from 'typeorm';
import { BaseService } from './base.service';
import type { InnovationDocumentService } from './innovation-document.service';
import { InnovationSupportsService } from './innovation-supports.service';
import type { InnovationTasksService } from './innovation-tasks.service';
import type { InnovationThreadsService } from './innovation-threads.service';
import SYMBOLS from './symbols';

@injectable()
export class InnovationAssessmentsService extends BaseService {
  constructor(
    @inject(SHARED_SYMBOLS.DomainService) private domainService: DomainService,
    @inject(SHARED_SYMBOLS.IRSchemaService) private irSchemaService: IRSchemaService,
    @inject(SHARED_SYMBOLS.NotifierService) private notifierService: NotifierService,
    @inject(SYMBOLS.InnovationDocumentService) private documentService: InnovationDocumentService,
    @inject(SYMBOLS.InnovationSupportsService) private innovationSupportsService: InnovationSupportsService,
    @inject(SYMBOLS.InnovationTasksService) private innovationTasksService: InnovationTasksService,
    @inject(SYMBOLS.InnovationThreadsService) private threadService: InnovationThreadsService
  ) {
    super();
  }

  /**
   * Gets the list of completed assessments for a given innovation
   */
  async getAssessmentsList(
    innovationId: string,
    entityManager?: EntityManager
  ): Promise<
    {
      id: string;
      majorVersion: number;
      minorVersion: number;
      startedAt: Date;
      finishedAt: Date;
    }[]
  > {
    const em = entityManager ?? this.sqlConnection.manager;

    const assessments = await em
      .createQueryBuilder(InnovationAssessmentEntity, 'assessment')
      .select([
        'assessment.id',
        'assessment.majorVersion',
        'assessment.minorVersion',
        'assessment.startedAt',
        'assessment.finishedAt'
      ])
      .where('assessment.innovation_id = :innovationId', { innovationId })
      .andWhere('assessment.startedAt IS NOT NULL')
      .andWhere('assessment.finishedAt IS NOT NULL')
      .orderBy('assessment.startedAt', 'DESC')
      .getMany();

    return assessments.map(a => ({
      id: a.id,
      majorVersion: a.majorVersion,
      minorVersion: a.minorVersion,
      // We verify that is not null on the query.
      startedAt: a.startedAt!,
      finishedAt: a.finishedAt!
    }));
  }

  async getInnovationAssessmentInfo(
    domainContext: DomainContextType,
    assessmentId: string,
    entityManager?: EntityManager
  ): Promise<InnovationAssessmentType> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const assessment = await connection
      .createQueryBuilder(InnovationAssessmentEntity, 'assessment')
      .select([
        'assessment.id',
        'assessment.majorVersion',
        'assessment.minorVersion',
        'assessment.editReason',
        'assessment.description',
        'assessment.startedAt',
        'assessment.finishedAt',
        'assessment.summary',
        'assessment.updatedAt',
        'assessment.updatedBy',
        // questions
        'assessment.maturityLevel',
        'assessment.maturityLevelComment',
        'assessment.hasRegulatoryApprovals',
        'assessment.hasRegulatoryApprovalsComment',
        'assessment.hasEvidence',
        'assessment.hasEvidenceComment',
        'assessment.hasValidation',
        'assessment.hasValidationComment',
        'assessment.hasProposition',
        'assessment.hasPropositionComment',
        'assessment.hasCompetitionKnowledge',
        'assessment.hasCompetitionKnowledgeComment',
        'assessment.hasImplementationPlan',
        'assessment.hasImplementationPlanComment',
        'assessment.hasScaleResource',
        'assessment.hasScaleResourceComment',
        // relations
        'assignTo.id',
        'organisationUnit.id',
        'organisationUnit.name',
        'organisationUnit.acronym',
        'organisation.id',
        'organisation.name',
        'organisation.acronym',
        'previousAssessment.id',
        'previousAssessment.majorVersion',
        'previousAssessment.minorVersion',
        'previousAssessment.createdAt',
        'reassessmentRequest.updatedInnovationRecord',
        'reassessmentRequest.description',
        'reassessmentRequest.reassessmentReason',
        'reassessmentRequest.otherReassessmentReason',
        'reassessmentRequest.whatSupportDoYouNeed',
        'reassessmentRequest.createdAt',
        'innovation.id',
        'currentAssessment.id'
      ])
      .leftJoin('assessment.assignTo', 'assignTo')
      .leftJoin('assessment.organisationUnits', 'organisationUnit')
      .leftJoin('organisationUnit.organisation', 'organisation')
      .leftJoin('assessment.reassessmentRequest', 'reassessmentRequest')
      .leftJoin('assessment.previousAssessment', 'previousAssessment')
      .innerJoin('assessment.innovation', 'innovation')
      .innerJoin('innovation.currentAssessment', 'currentAssessment')
      .where('assessment.id = :assessmentId', { assessmentId })
      .getOne();
    if (!assessment) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_ASSESSMENT_NOT_FOUND);
    }

    if (
      !assessment.finishedAt &&
      ![ServiceRoleEnum.ASSESSMENT, ServiceRoleEnum.ADMIN].includes(domainContext.currentRole.role)
    ) {
      throw new ForbiddenError(InnovationErrorsEnum.INNOVATION_ASSESSMENT_NOT_SUBMITTED);
    }

    // Fetch users names.
    const usersInfo = await this.domainService.users.getUsersMap(
      {
        userIds: [...(assessment.assignTo ? [assessment.assignTo.id] : []), assessment.updatedBy]
      },
      connection
    );

    return {
      id: assessment.id,
      majorVersion: assessment.majorVersion,
      minorVersion: assessment.minorVersion,
      editReason: assessment.editReason,
      ...(assessment.previousAssessment && {
        previousAssessment: {
          id: assessment.previousAssessment.id,
          majorVersion: assessment.previousAssessment.majorVersion,
          minorVersion: assessment.previousAssessment.minorVersion
        }
      }),
      ...(assessment.reassessmentRequest && {
        reassessment: {
          createdAt: assessment.reassessmentRequest.createdAt,
          ...(assessment.reassessmentRequest.updatedInnovationRecord && {
            updatedInnovationRecord: assessment.reassessmentRequest.updatedInnovationRecord
          }),
          ...(assessment.previousAssessment && { previousCreatedAt: assessment.previousAssessment?.createdAt }),
          reassessmentReason: assessment.reassessmentRequest.reassessmentReason,
          ...(assessment.reassessmentRequest.otherReassessmentReason && {
            otherReassessmentReason: assessment.reassessmentRequest.otherReassessmentReason
          }),
          description: assessment.reassessmentRequest.description,
          whatSupportDoYouNeed: assessment.reassessmentRequest.whatSupportDoYouNeed,
          sectionsUpdatedSinceLastAssessment: await this.getSectionsUpdatedSincePreviousAssessment(
            assessment.id,
            connection
          )
        }
      }),
      summary: assessment.summary,
      description: assessment.description,
      startedAt: assessment.startedAt,
      finishedAt: assessment.finishedAt,
      ...(assessment.assignTo && {
        assignTo: {
          id: assessment.assignTo.id,
          name: usersInfo.getDisplayName(assessment.assignTo.id, ServiceRoleEnum.ASSESSMENT)
        }
      }),
      maturityLevel: assessment.maturityLevel,
      maturityLevelComment: assessment.maturityLevelComment,
      hasRegulatoryApprovals: assessment.hasRegulatoryApprovals,
      hasRegulatoryApprovalsComment: assessment.hasRegulatoryApprovalsComment,
      hasEvidence: assessment.hasEvidence,
      hasEvidenceComment: assessment.hasEvidenceComment,
      hasValidation: assessment.hasValidation,
      hasValidationComment: assessment.hasValidationComment,
      hasProposition: assessment.hasProposition,
      hasPropositionComment: assessment.hasPropositionComment,
      hasCompetitionKnowledge: assessment.hasCompetitionKnowledge,
      hasCompetitionKnowledgeComment: assessment.hasCompetitionKnowledgeComment,
      hasImplementationPlan: assessment.hasImplementationPlan,
      hasImplementationPlanComment: assessment.hasImplementationPlanComment,
      hasScaleResource: assessment.hasScaleResource,
      hasScaleResourceComment: assessment.hasScaleResourceComment,
      suggestedOrganisations: InnovationHelper.parseOrganisationUnitsToOrganisationsFormat(
        assessment.organisationUnits.map(item => ({
          id: item.id,
          name: item.name,
          acronym: item.acronym,
          organisation: {
            id: item.organisation.id,
            name: item.organisation.name,
            acronym: item.organisation.acronym
          }
        }))
      ),
      updatedAt: assessment.updatedAt,
      updatedBy: {
        id: assessment.updatedBy,
        name: usersInfo.getDisplayName(assessment.updatedBy)
      },
      isLatest: assessment.id === assessment.innovation.currentAssessment?.id
    };
  }

  /**
   * returns the sections updated since the previous assessment, it will return empty if there's no previous assessment.
   */
  async getSectionsUpdatedSincePreviousAssessment(
    assessmentId: string,
    entityManager?: EntityManager
  ): Promise<string[]> {
    const em = entityManager ?? this.sqlConnection.manager;

    // This needs to be a temporal query and those aren't supported by typeOrm, so we need to do it manually.
    const dbResult = await em.query(
      `
      SELECT DISTINCT(section) as section
      FROM innovation_section FOR system_time ALL s
      INNER join innovation_assessment a on s.innovation_id = a.innovation_id
      INNER join innovation_assessment p on a.previous_assessment_id = p.id
      WHERE
      s.updated_at BETWEEN p.finished_at AND COALESCE(a.finished_at, GETDATE())
      AND a.id = @0;
      `,
      [assessmentId]
    );

    if (!dbResult.length) {
      return [];
    }

    const schema = await this.irSchemaService.getSchema();
    return dbResult.map((item: any) => item.section).filter((s: string) => schema.model.isSubsectionValid(s));
  }

  async createInnovationAssessment(
    domainContext: DomainContextType,
    innovationId: string,
    data: { message: string },
    entityManager?: EntityManager
  ): Promise<{ id: string }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const assessmentsCount = await connection
      .createQueryBuilder(InnovationAssessmentEntity, 'assessment')
      .where('assessment.innovation_id = :innovationId', { innovationId })
      .getCount();
    if (assessmentsCount > 0) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_ASSESSMENT_ALREADY_EXISTS);
    }

    return connection.transaction(async transaction => {
      const assessment = await transaction.save(
        InnovationAssessmentEntity,
        InnovationAssessmentEntity.new({
          description: '', // assessment.description,
          innovation: InnovationEntity.new({ id: innovationId }),
          assignTo: UserEntity.new({ id: domainContext.id }),
          startedAt: new Date(),
          createdBy: domainContext.id,
          updatedBy: domainContext.id,
          majorVersion: 1,
          minorVersion: 0
        })
      );

      await transaction.update(
        InnovationEntity,
        { id: innovationId },
        {
          currentAssessment: { id: assessment.id },
          currentMajorAssessment: { id: assessment.id },
          status: InnovationStatusEnum.NEEDS_ASSESSMENT,
          statusUpdatedAt: new Date().toISOString()
        }
      );

      const thread = await this.threadService.createThreadOrMessage(
        domainContext,
        innovationId,
        'Initial needs assessment',
        data.message,
        assessment.id,
        ThreadContextTypeEnum.NEEDS_ASSESSMENT,
        transaction,
        false
      );

      await this.domainService.innovations.addActivityLog(
        transaction,
        {
          innovationId: innovationId,
          activity: ActivityEnum.NEEDS_ASSESSMENT_START,
          domainContext
        },
        { comment: { id: thread.thread.id, value: data.message } }
      );

      await this.notifierService.send(domainContext, NotifierTypeEnum.NEEDS_ASSESSMENT_STARTED, {
        innovationId,
        assessmentId: assessment.id,
        threadId: thread.thread.id,
        messageId: thread.message.id,
        message: data.message
      });

      return { id: assessment['id'] };
    });
  }

  async editInnovationAssessment(
    domainContext: DomainContextType,
    innovationId: string,
    data: { reason: string },
    entityManager?: EntityManager
  ): Promise<{ id: string }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    // Get the latest assessment record.
    const latestAssessment = await connection
      .createQueryBuilder(InnovationAssessmentEntity, 'assessment')
      .innerJoinAndSelect('assessment.innovation', 'innovation')
      .leftJoinAndSelect('assessment.assignTo', 'assignTo')
      .leftJoinAndSelect('assessment.organisationUnits', 'organisationUnits')
      .where('innovation.id = :innovationId', { innovationId })
      .orderBy('assessment.createdAt', 'DESC') // Not needed, but it doesn't do any harm.
      .getOne();

    if (!latestAssessment) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_ASSESSMENT_NOT_FOUND);
    }

    if (!latestAssessment.finishedAt) {
      throw new ConflictError(InnovationErrorsEnum.INNOVATION_ASSESSMENT_NOT_SUBMITTED);
    }

    const now = new Date();

    return connection.transaction(async transaction => {
      const assessmentClone = await transaction.save(InnovationAssessmentEntity, {
        ...omit(latestAssessment, [
          'id',
          'finishedAt',
          'startedAt',
          'createdAt',
          'createdBy',
          'updatedAt',
          'updatedBy',
          'deletedAt',
          'assignTo',
          'previousAssessment',
          'reassessmentRequest'
        ]),
        startedAt: now,
        createdBy: domainContext.id,
        updatedBy: domainContext.id,
        assignTo: UserEntity.new({ id: domainContext.id }),
        majorVersion: latestAssessment.majorVersion,
        minorVersion: latestAssessment.minorVersion + 1,
        editReason: data.reason,
        previousAssessment: { id: latestAssessment.id }
      });

      await this.updateAssessmentThreadAssignedNA(
        domainContext,
        innovationId,
        domainContext.currentRole.id,
        transaction
      );

      await transaction.update(
        InnovationEntity,
        { id: latestAssessment.innovation.id },
        {
          status: InnovationStatusEnum.NEEDS_ASSESSMENT,
          statusUpdatedAt: now,
          updatedBy: assessmentClone.createdBy,
          currentAssessment: { id: assessmentClone.id }
        }
      );

      await this.domainService.innovations.addActivityLog(
        transaction,
        {
          innovationId: innovationId,
          activity: ActivityEnum.NEEDS_ASSESSMENT_START_EDIT,
          domainContext
        },
        { assessmentId: assessmentClone.id }
      );

      return { id: assessmentClone.id };
    });
  }

  async updateInnovationAssessment(
    domainContext: DomainContextType,
    innovationId: string,
    assessmentId: string,
    data: {
      summary?: null | string;
      description?: null | string;
      maturityLevel?: null | MaturityLevelCatalogueType;
      maturityLevelComment?: null | string;
      hasRegulatoryApprovals?: null | YesPartiallyNoCatalogueType;
      hasRegulatoryApprovalsComment?: null | string;
      hasEvidence?: null | YesPartiallyNoCatalogueType;
      hasEvidenceComment?: null | string;
      hasValidation?: null | YesPartiallyNoCatalogueType;
      hasValidationComment?: null | string;
      hasProposition?: null | YesPartiallyNoCatalogueType;
      hasPropositionComment?: null | string;
      hasCompetitionKnowledge?: null | YesPartiallyNoCatalogueType;
      hasCompetitionKnowledgeComment?: null | string;
      hasImplementationPlan?: null | YesPartiallyNoCatalogueType;
      hasImplementationPlanComment?: null | string;
      hasScaleResource?: null | YesPartiallyNoCatalogueType;
      hasScaleResourceComment?: null | string;
      suggestedOrganisationUnitsIds?: string[];
      isSubmission?: boolean;
    },
    entityManager?: EntityManager
  ): Promise<{ id: string }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const innovation = await connection
      .createQueryBuilder(InnovationEntity, 'innovation')
      .where('innovation.id = :innovationId', { innovationId })
      .getOne();

    if (!innovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    const dbAssessment = await connection
      .createQueryBuilder(InnovationAssessmentEntity, 'assessment')
      .leftJoinAndSelect('assessment.assignTo', 'assignTo')
      .leftJoinAndSelect('assessment.organisationUnits', 'organisationUnits')
      .leftJoinAndSelect('assessment.reassessmentRequest', 'reassessmentRequest')
      .where('assessment.id = :assessmentId', { assessmentId })
      .getOne();
    if (!dbAssessment) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_ASSESSMENT_NOT_FOUND);
    }
    if (dbAssessment.finishedAt) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_ASSESSMENT_ALREADY_SUBMITTED);
    }

    // Validate rule that no suggestion can be removed after being suggested
    if (
      data.isSubmission &&
      data.suggestedOrganisationUnitsIds &&
      dbAssessment.organisationUnits.some(u => !data.suggestedOrganisationUnitsIds!.includes(u.id))
    ) {
      throw new ConflictError(InnovationErrorsEnum.INNOVATION_ASSESSMENT_SUGGESTIONS_CANT_BE_REMOVED);
    }

    const result = await connection.transaction(async transaction => {
      // Merge new data with assessment record.
      const assessment = Object.entries(data).reduce((acc, item) => ({ ...acc, [item[0]]: item[1] }), dbAssessment);

      assessment.updatedBy = domainContext.id;
      // if assessment doesn't have an assigned assessor, assign the current user.
      if (!assessment.assignTo) {
        assessment.assignTo = UserEntity.new({ id: domainContext.id });
        await this.updateAssessmentThreadAssignedNA(
          domainContext,
          innovationId,
          domainContext.currentRole.id,
          transaction
        );
      }

      if (data.suggestedOrganisationUnitsIds) {
        assessment.organisationUnits = data.suggestedOrganisationUnitsIds.map(id => OrganisationUnitEntity.new({ id }));
      }

      // Following operations are only applied when submitting the assessment.
      if (data.isSubmission) {
        // Maybe this could be delegated to joi
        if (!data.suggestedOrganisationUnitsIds || data.suggestedOrganisationUnitsIds.length === 0) {
          throw new BadRequestError(InnovationErrorsEnum.INNOVATION_ASSESSMENT_SUBMISSION_NO_SUGGESTIONS);
        }
        if (!data.summary) {
          throw new BadRequestError(InnovationErrorsEnum.INNOVATION_ASSESSMENT_SUBMISSION_NO_SUMMARY);
        }

        await this.assessmentSubmission(
          domainContext,
          innovationId,
          assessment,
          data.suggestedOrganisationUnitsIds,
          data.summary,
          transaction
        );
      } else {
        // it's draft
        // if the innovation has a reassessment request and is in state WAITING_NEEDS_ASSESSMENT
        // change innovation state to NEEDS_ASSESSMENT
        if (dbAssessment.reassessmentRequest && innovation.status === InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT) {
          assessment.startedAt = new Date();
          await transaction.update(
            InnovationEntity,
            { id: innovationId },
            {
              status: InnovationStatusEnum.NEEDS_ASSESSMENT,
              statusUpdatedAt: new Date().toISOString(),
              updatedBy: domainContext.id
            }
          );
        }
      }

      const savedAssessment = await transaction.save(InnovationAssessmentEntity, assessment);

      return { id: savedAssessment.id };
    });

    if (data.isSubmission && !dbAssessment.finishedAt) {
      await this.notifierService.send(domainContext, NotifierTypeEnum.NEEDS_ASSESSMENT_COMPLETED, {
        innovationId: innovationId,
        assessmentId: assessmentId
      });
    }

    return { id: result.id };
  }

  /**
   * @param domainContext - The user requesting the action. In this case, it can be an innovator or a NA
   * @param innovationId
   * @param data - The data to be used to create the new assessment request.
   * @returns - The assessment request id and the new assessment id.
   */
  async createInnovationReassessment(
    domainContext: DomainContextType,
    innovationId: string,
    data: ReassessmentType,
    entityManager?: EntityManager
  ): Promise<{ assessment: { id: string }; reassessment: { id: string } }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const innovation = await connection
      .createQueryBuilder(InnovationEntity, 'innovation')
      .select(['innovation.id', 'innovation.status', 'innovationOwner.id', 'support.id', 'support.status'])
      .leftJoin('innovation.owner', 'innovationOwner')
      .leftJoin('innovation.innovationSupports', 'support')
      .where('innovation.id = :innovationId', { innovationId })
      .getOne();

    if (!innovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    // Extra validation constraints
    switch (domainContext.currentRole.role) {
      case ServiceRoleEnum.INNOVATOR: {
        if (
          innovation.status === InnovationStatusEnum.IN_PROGRESS &&
          innovation.innovationSupports?.some(s => s.status === InnovationSupportStatusEnum.ENGAGING)
        ) {
          throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_CANNOT_REQUEST_REASSESSMENT);
        }

        if (innovation.status === InnovationStatusEnum.ARCHIVED && innovation.owner?.id !== domainContext.id) {
          throw new ForbiddenError(InnovationErrorsEnum.INNOVATION_COLLABORATOR_MUST_BE_OWNER);
        }
        if (
          innovation.status !== InnovationStatusEnum.ARCHIVED &&
          innovation.status !== InnovationStatusEnum.IN_PROGRESS
        ) {
          throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_CANNOT_REQUEST_REASSESSMENT);
        }
        break;
      }
      case ServiceRoleEnum.ASSESSMENT: {
        if (innovation.status !== InnovationStatusEnum.IN_PROGRESS) {
          throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_CANNOT_REQUEST_REASSESSMENT);
        }
        break;
      }
      default: {
        // Shouldn't happen since the user role is checked before.
        throw new ForbiddenError(UserErrorsEnum.USER_ROLE_NOT_ALLOWED);
      }
    }

    // Get the latest assessment record.
    const previousAssessment = await connection
      .createQueryBuilder(InnovationAssessmentEntity, 'assessment')
      .select(['assessment.id', 'assessment.majorVersion'])
      .where('assessment.innovation_id = :innovationId', { innovationId })
      .orderBy('assessment.createdAt', 'DESC') // Not needed, but it doesn't do any harm.
      .getOne();
    if (!previousAssessment) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_ASSESSMENT_NOT_FOUND);
    }

    const result = await connection.transaction(async transaction => {
      // 1. Update the innovation status to WAITING_NEEDS_ASSESSMENT
      // 2. Sync the changes on the documents (update submitted with the draft changes)
      // 3. Soft deletes the previous assessment record
      // 4. Create a new assessment record copied from the previously soft deleted one and sets deleted_at = NULL
      // 5. Create a new reassessment record
      // 6. Create an activity log for the reassessment
      // 7. Sends notifications

      const now = new Date();

      await this.documentService.syncDocumentVersions(domainContext, innovationId, transaction, { updatedAt: now });

      const assessment = await transaction.save(
        InnovationAssessmentEntity,
        InnovationAssessmentEntity.new({
          description: '', // assessment.description,
          innovation: InnovationEntity.new({ id: innovationId }),
          assignTo: null,
          createdBy: domainContext.id,
          updatedBy: domainContext.id,
          previousAssessment: InnovationAssessmentEntity.new({ id: previousAssessment.id }),
          majorVersion: previousAssessment.majorVersion + 1,
          minorVersion: 0
        })
      );

      await transaction.update(
        InnovationEntity,
        { id: assessment.innovation.id },
        {
          lastAssessmentRequestAt: now,
          status: InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT,
          statusUpdatedAt: now,
          archiveReason: null,
          updatedBy: assessment.createdBy,
          currentAssessment: { id: assessment.id },
          currentMajorAssessment: { id: assessment.id }
        }
      );

      const reassessment = await transaction.save(
        InnovationReassessmentRequestEntity,
        InnovationReassessmentRequestEntity.new({
          assessment: InnovationAssessmentEntity.new({ id: assessment.id }),
          innovation: InnovationEntity.new({ id: innovationId }),
          description: data.description,
          reassessmentReason: data.reassessmentReason,
          ...(data.otherReassessmentReason && { otherReassessmentReason: data.otherReassessmentReason }),
          whatSupportDoYouNeed: data.whatSupportDoYouNeed,
          createdBy: assessment.createdBy,
          updatedBy: assessment.updatedBy
        })
      );

      await this.domainService.innovations.addActivityLog(
        transaction,
        {
          innovationId: assessment.innovation.id,
          activity: ActivityEnum.NEEDS_ASSESSMENT_REASSESSMENT_REQUESTED,
          domainContext
        },
        { assessment: { id: assessment.id }, reassessment: { id: reassessment.id } }
      );

      // Update supportDescription on innovation_document and innovation_document_draft
      const updatedAt = new Date();
      await transaction.query(
        `UPDATE innovation_document
             SET document = JSON_MODIFY(document, @0, @1), updated_by=@2, updated_at=@3, is_snapshot=0, description=NULL WHERE id = @4`,
        [
          `$.INNOVATION_DESCRIPTION.supportDescription`,
          data['whatSupportDoYouNeed'],
          domainContext.id,
          updatedAt,
          innovationId
        ]
      );

      await transaction.query(
        `UPDATE innovation_document_draft
             SET document = JSON_MODIFY(document, @0, @1), updated_by=@2, updated_at=@3 WHERE id = @4`,
        [
          `$.INNOVATION_DESCRIPTION.supportDescription`,
          data['whatSupportDoYouNeed'],
          domainContext.id,
          updatedAt,
          innovationId
        ]
      );

      return { assessment: { id: assessment.id }, reassessment: { id: reassessment.id } };
    });

    await this.notifierService.send(domainContext, NotifierTypeEnum.INNOVATION_SUBMITTED, {
      innovationId: innovationId,
      reassessment: true
    });

    return {
      assessment: { id: result.assessment.id },
      reassessment: { id: result.reassessment.id }
    };
  }

  async updateAssessor(
    domainContext: DomainContextType,
    innovationId: string,
    assessmentId: string,
    assessorId: string,
    entityManager?: EntityManager
  ): Promise<{ assessmentId: string; assessorId: string }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const assessment = await connection
      .createQueryBuilder(InnovationAssessmentEntity, 'assessment')
      .leftJoinAndSelect('assessment.assignTo', 'assignedAssessor')
      .innerJoinAndSelect('assessment.innovation', 'innovation')
      .where('assessment.id = :assessmentId', { assessmentId })
      .andWhere('innovation.id = :innovationId', { innovationId })
      .getOne();

    if (!assessment) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_ASSESSMENT_NOT_FOUND);
    }

    const newAssessor = await connection
      .createQueryBuilder(UserEntity, 'user')
      .innerJoinAndSelect('user.serviceRoles', 'serviceRoles')
      .where('user.id = :assessorId', { assessorId })
      .andWhere('serviceRoles.role = :serviceRoleType', {
        serviceRoleType: ServiceRoleEnum.ASSESSMENT
      })
      .getOne();

    const assessorRole = newAssessor?.serviceRoles.find(r => r.role === ServiceRoleEnum.ASSESSMENT);
    if (!(newAssessor && assessorRole)) {
      throw new NotFoundError(UserErrorsEnum.USER_SQL_NOT_FOUND);
    }

    const previousAssessor = assessment.assignTo;

    const updatedAssessment = await connection.transaction(async transaction => {
      await transaction.update(InnovationAssessmentEntity, { id: assessment.id }, { assignTo: newAssessor });

      await this.updateAssessmentThreadAssignedNA(domainContext, innovationId, assessorRole.id, transaction);

      if (previousAssessor) {
        const tasks = await transaction
          .createQueryBuilder(InnovationTaskEntity, 'task')
          .innerJoin('task.innovationSection', 'section')
          .where('section.innovation_id = :innovationId', { innovationId })
          // .andWhere('task.created_by_user_role_id = :previousAssessorRoleId', {
          //   previousAssessorRoleId: previousAssessor.id
          // })
          .andWhere('task.status = :status', { status: InnovationTaskStatusEnum.OPEN })
          .getMany();

        for (const task of tasks) {
          await this.innovationTasksService.reassignTask(domainContext, task.id, assessorRole.id, transaction);
        }
      }

      return {
        id: assessment.id,
        newAssessor: { id: newAssessor.id, identityId: newAssessor.identityId }
      };
    });

    await this.notifierService.send(domainContext, NotifierTypeEnum.NEEDS_ASSESSMENT_ASSESSOR_UPDATE, {
      innovationId,
      assessmentId: updatedAssessment.id,
      ...(previousAssessor && { previousAssessor: { id: previousAssessor.id } }),
      newAssessor: { id: newAssessor.id }
    });

    return { assessmentId: updatedAssessment.id, assessorId: updatedAssessment.newAssessor.id };
  }

  async upsertExemption(
    domainContext: DomainContextType,
    assessmentId: string,
    data: { reason: InnovationAssessmentKPIExemptionType; message?: string },
    entityManager?: EntityManager
  ): Promise<void> {
    const em = entityManager ?? this.sqlConnection.manager;

    const assessment = await em
      .createQueryBuilder(InnovationAssessmentEntity, 'assessment')
      .where('assessment.id = :assessmentId', { assessmentId })
      .getOne();
    if (!assessment) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_ASSESSMENT_NOT_FOUND);
    }

    const now = new Date();
    await em.update(
      InnovationAssessmentEntity,
      { id: assessmentId },
      {
        exemptedReason: data.reason,
        exemptedMessage: data.message ?? null,
        updatedAt: now,
        updatedBy: domainContext.id,
        ...(!assessment.exemptedAt ? { exemptedAt: now } : {}) // only update on the first "exemption request"
      }
    );
  }

  async getExemption(
    assessmentId: string,
    entityManager?: EntityManager
  ): Promise<{
    isExempted: boolean;
    exemption?: {
      reason: InnovationAssessmentKPIExemptionType;
      message?: string;
      exemptedAt: Date;
    };
  }> {
    const em = entityManager ?? this.sqlConnection.manager;

    const assessment = await em
      .createQueryBuilder(InnovationAssessmentEntity, 'assessment')
      .select(['assessment.id', 'assessment.exemptedReason', 'assessment.exemptedMessage', 'assessment.exemptedAt'])
      .where('assessment.id = :assessmentId', { assessmentId })
      .getOne();
    if (!assessment) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_ASSESSMENT_NOT_FOUND);
    }

    if (assessment.exemptedAt && assessment.exemptedReason) {
      return {
        isExempted: true,
        exemption: {
          reason: assessment.exemptedReason,
          message: assessment.exemptedMessage ?? undefined,
          exemptedAt: assessment.exemptedAt
        }
      };
    } else {
      return { isExempted: false };
    }
  }

  private async assessmentSubmission(
    domainContext: DomainContextType,
    innovationId: string,
    assessment: InnovationAssessmentEntity,
    suggestedOrganisationUnitsIds: string[],
    summary: string,
    transaction: EntityManager
  ): Promise<void> {
    const assessmentId = assessment.id;

    assessment.finishedAt = new Date();

    if (!suggestedOrganisationUnitsIds.length) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_ASSESSMENT_SUBMISSION_NO_SUGGESTIONS);
    }

    await transaction.update(
      InnovationEntity,
      { id: innovationId },
      {
        hasBeenAssessed: true,
        status: InnovationStatusEnum.IN_PROGRESS,
        statusUpdatedAt: new Date().toISOString(),
        updatedBy: domainContext.id
      }
    );

    await this.domainService.innovations.addActivityLog(
      transaction,
      {
        innovationId: innovationId,
        activity: ActivityEnum.NEEDS_ASSESSMENT_COMPLETED,
        domainContext
      },
      { assessmentId: assessment.id }
    );

    if (suggestedOrganisationUnitsIds?.length) {
      // Add suggested organisations (NOT units) names to activity log.
      const organisations = await transaction
        .createQueryBuilder(OrganisationEntity, 'organisation')
        .distinct()
        .innerJoin('organisation.organisationUnits', 'organisationUnits')
        .where('organisationUnits.id IN (:...ids)', { ids: suggestedOrganisationUnitsIds })
        .andWhere('organisation.inactivated_at IS NULL')
        .andWhere('organisationUnits.inactivated_at IS NULL')
        .getMany();

      await this.domainService.innovations.addActivityLog(
        transaction,
        {
          innovationId: innovationId,
          activity: ActivityEnum.ORGANISATION_SUGGESTION,
          domainContext
        },
        { organisations: organisations.map(item => item.name) }
      );

      let newSuggestions = suggestedOrganisationUnitsIds;
      // If it's the edition of a (re)assessment, compare the new suggested org units with the latest (re)assessment.
      if (assessment.minorVersion > 0) {
        const lastSubmittedAssessment = await transaction
          .createQueryBuilder(InnovationAssessmentEntity, 'assessment')
          .leftJoinAndSelect('assessment.organisationUnits', 'organisationUnits')
          .where('assessment.finishedAt IS NOT NULL')
          .andWhere('assessment.innovation = :innovationId', { innovationId })
          .orderBy('assessment.finishedAt', 'DESC')
          .getOne();

        const lastestAssessmentUnitsIds = lastSubmittedAssessment?.organisationUnits.map(unit => unit.id) ?? [];
        newSuggestions = suggestedOrganisationUnitsIds.filter(id => !lastestAssessmentUnitsIds.includes(id));
      }

      if (newSuggestions.length > 0) {
        await this.innovationSupportsService.createSuggestedSupports(
          domainContext,
          innovationId,
          newSuggestions,
          transaction
        );

        await this.domainService.innovations.addSupportLog(
          transaction,
          { id: domainContext.id, roleId: domainContext.currentRole.id },
          innovationId,
          {
            type: InnovationSupportLogTypeEnum.ASSESSMENT_SUGGESTION,
            description: 'NA suggested units',
            suggestedOrganisationUnits: newSuggestions,
            params: { assessmentId }
          }
        );

        await this.notifierService.send(domainContext, NotifierTypeEnum.ORGANISATION_UNITS_SUGGESTION, {
          innovationId,
          unitsIds: newSuggestions,
          comment: summary
        });
      }
    }
  }

  private async updateAssessmentThreadAssignedNA(
    domainContext: DomainContextType,
    innovationId: string,
    assessorRoleId: string,
    entityManager: EntityManager
  ): Promise<void> {
    const thread = await entityManager
      .createQueryBuilder(InnovationThreadEntity, 'thread')
      .where('thread.context_type = :contextType', { contextType: ThreadContextTypeEnum.NEEDS_ASSESSMENT }) // Only one thread per innovation of type needs_assessment
      .andWhere('thread.innovation_id = :innovationId', { innovationId: innovationId })
      .getOne();

    if (!thread) {
      return;
    }

    await this.threadService.removeAssessmentFollowers(thread.id, entityManager);
    await this.threadService.addFollowersToThread(domainContext, thread.id, [assessorRoleId], false, entityManager);
  }
}
