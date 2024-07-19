import { inject, injectable } from 'inversify';

import {
  InnovationAssessmentEntity,
  InnovationEntity,
  InnovationReassessmentRequestEntity,
  InnovationSupportEntity,
  OrganisationEntity,
  OrganisationUnitEntity,
  UserEntity,
  UserRoleEntity
} from '@innovations/shared/entities';
import {
  ActivityEnum,
  InnovationStatusEnum,
  InnovationSupportLogTypeEnum,
  InnovationSupportStatusEnum,
  MaturityLevelCatalogueType,
  NotifierTypeEnum,
  ServiceRoleEnum,
  ThreadContextTypeEnum,
  YesPartiallyNoCatalogueType
} from '@innovations/shared/enums';
import {
  ForbiddenError,
  InnovationErrorsEnum,
  InternalServerError,
  NotFoundError,
  UnprocessableEntityError,
  UserErrorsEnum
} from '@innovations/shared/errors';
import type { DomainService, NotifierService } from '@innovations/shared/services';
import type { DomainContextType, InnovationAssessmentKPIExemptionType } from '@innovations/shared/types';

import { InnovationHelper } from '../_helpers/innovation.helper';
import type { InnovationAssessmentType, ReassessmentType } from '../_types/innovation.types';

import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { EntityManager } from 'typeorm';
import { BaseService } from './base.service';
import type { InnovationDocumentService } from './innovation-document.service';
import type { InnovationThreadsService } from './innovation-threads.service';
import SYMBOLS from './symbols';

@injectable()
export class InnovationAssessmentsService extends BaseService {
  constructor(
    @inject(SHARED_SYMBOLS.DomainService) private domainService: DomainService,
    @inject(SHARED_SYMBOLS.NotifierService) private notifierService: NotifierService,
    @inject(SYMBOLS.InnovationThreadsService) private threadService: InnovationThreadsService,
    @inject(SYMBOLS.InnovationDocumentService) private documentService: InnovationDocumentService
  ) {
    super();
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
        'assessment.description',
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
        'reassessmentRequest.updatedInnovationRecord',
        'reassessmentRequest.description',
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
    const usersInfo = await this.domainService.users.getUsersList({
      userIds: [...(assessment.assignTo ? [assessment.assignTo.id] : []), assessment.updatedBy]
    });

    if (assessment.reassessmentRequest && !assessment.previousAssessment) {
      throw new InternalServerError(
        InnovationErrorsEnum.INNOVATION_ASSESSMENT_REASSESSMENT_REQUEST_WITHOUT_PREVIOUS_ASSESSMENT
      );
    }

    return {
      id: assessment.id,
      ...(!assessment.reassessmentRequest
        ? {}
        : assessment.reassessmentRequest.updatedInnovationRecord
          ? {
              reassessment: {
                updatedInnovationRecord: assessment.reassessmentRequest.updatedInnovationRecord,
                description: assessment.reassessmentRequest.description,
                previousAssessmentId: assessment.previousAssessment!.id
              }
            }
          : {
              reassessment: {
                description: assessment.reassessmentRequest.description,
                previousAssessmentId: assessment.previousAssessment!.id
              }
            }),
      summary: assessment.summary,
      description: assessment.description,
      finishedAt: assessment.finishedAt,
      ...(assessment.assignTo && {
        assignTo: {
          id: assessment.assignTo.id,
          name: usersInfo.find(user => user.id === assessment.assignTo?.id)?.displayName || ''
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
        name: usersInfo.find(user => user.id === assessment.updatedBy)?.displayName || ''
      },
      isLatest: assessment.id === assessment.innovation.currentAssessment?.id
    };
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
          createdBy: domainContext.id,
          updatedBy: domainContext.id
        })
      );

      await transaction.update(
        InnovationEntity,
        { id: innovationId },
        {
          currentAssessment: { id: assessment.id },
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

    const result = await connection.transaction(async transaction => {
      // Merge new data with assessment record.
      const assessment = Object.entries(data).reduce((acc, item) => ({ ...acc, [item[0]]: item[1] }), dbAssessment);

      assessment.updatedBy = domainContext.id;
      // if assessment doesn't have an assigned assessor, assign the current user.
      if (!assessment.assignTo) {
        assessment.assignTo = UserEntity.new({ id: domainContext.id });
      }

      const currentUnitSuggestionsIds = (assessment.organisationUnits ?? []).map(u => u.id);
      if (data.suggestedOrganisationUnitsIds) {
        assessment.organisationUnits = data.suggestedOrganisationUnitsIds.map(id => OrganisationUnitEntity.new({ id }));
      }

      // Following operations are only applied when submitting the assessment.
      if (data.isSubmission) {
        assessment.finishedAt = new Date();

        // If it's first assessment submission
        if (!dbAssessment.finishedAt) {
          await transaction.update(
            InnovationEntity,
            { id: innovationId },
            {
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

          // if it's editing an already submitted assessment
        } else {
          await this.domainService.innovations.addActivityLog(
            transaction,
            {
              innovationId: innovationId,
              activity: ActivityEnum.NEEDS_ASSESSMENT_EDITED,
              domainContext
            },
            { assessmentId: assessment.id }
          );
        }

        if (data.suggestedOrganisationUnitsIds?.length) {
          // Add suggested organisations (NOT units) names to activity log.
          const organisations = await transaction
            .createQueryBuilder(OrganisationEntity, 'organisation')
            .distinct()
            .innerJoin('organisation.organisationUnits', 'organisationUnits')
            .where('organisationUnits.id IN (:...ids)', { ids: data.suggestedOrganisationUnitsIds })
            .andWhere('organisation.inactivated_at IS NULL')
            .andWhere('organisationUnits.inactivated_at IS NULL')
            .getMany();

          // There's a bug open for this for discussion but maybe only add ActivityLog if there were suggestions changed.
          await this.domainService.innovations.addActivityLog(
            transaction,
            {
              innovationId: innovationId,
              activity: ActivityEnum.ORGANISATION_SUGGESTION,
              domainContext
            },
            { organisations: organisations.map(item => item.name) }
          );

          const newSuggestions = dbAssessment.finishedAt
            ? data.suggestedOrganisationUnitsIds.filter(id => !currentUnitSuggestionsIds.includes(id))
            : data.suggestedOrganisationUnitsIds;
          if (newSuggestions.length > 0) {
            await this.domainService.innovations.addSupportLog(
              transaction,
              { id: domainContext.id, roleId: domainContext.currentRole.id },
              innovationId,
              {
                type: InnovationSupportLogTypeEnum.ASSESSMENT_SUGGESTION,
                description: 'NA suggested units',
                suggestedOrganisationUnits: newSuggestions
              }
            );

            await this.notifierService.send(domainContext, NotifierTypeEnum.ORGANISATION_UNITS_SUGGESTION, {
              innovationId,
              unitsIds: newSuggestions,
              comment: data.summary ?? ''
            });
          }
        }
      } else {
        // it's draft
        // if the innovation has a reassessment request and is in state WAITING_NEEDS_ASSESSMENT
        // change innovation state to NEEDS_ASSESSMENT
        if (dbAssessment.reassessmentRequest && innovation.status === InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT) {
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
      .select([
        'innovation.id',
        'innovation.status',
        'innovationOwner.id',
        'support.id',
        'support.status',
        'support.archiveSnapshot'
      ])
      .leftJoin('innovation.owner', 'innovationOwner')
      .innerJoin('innovation.innovationSupports', 'support')
      .where('innovation.id = :innovationId', { innovationId })
      .getOne();
    if (domainContext.currentRole.role === ServiceRoleEnum.INNOVATOR) {
      if (
        innovation &&
        innovation.status === InnovationStatusEnum.IN_PROGRESS &&
        innovation.innovationSupports?.some(s => s.status === InnovationSupportStatusEnum.ENGAGING)
      ) {
        throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_CANNOT_REQUEST_REASSESSMENT);
      }

      if (
        innovation &&
        innovation.status === InnovationStatusEnum.ARCHIVED &&
        innovation.owner?.id !== domainContext.id
      ) {
        throw new ForbiddenError(InnovationErrorsEnum.INNOVATION_COLLABORATOR_MUST_BE_OWNER);
      }
      if (
        innovation &&
        innovation.status !== InnovationStatusEnum.ARCHIVED &&
        innovation.status !== InnovationStatusEnum.IN_PROGRESS
      ) {
        throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_CANNOT_REQUEST_REASSESSMENT);
      }
    }
    if (domainContext.currentRole.role === ServiceRoleEnum.ASSESSMENT) {
      if (innovation && innovation.status !== InnovationStatusEnum.IN_PROGRESS) {
        throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_CANNOT_REQUEST_REASSESSMENT);
      }
    }

    // Get the latest assessment record.
    const assessment = await connection
      .createQueryBuilder(InnovationAssessmentEntity, 'assessment')
      .innerJoinAndSelect('assessment.innovation', 'innovation')
      .leftJoinAndSelect('assessment.assignTo', 'assignTo')
      .leftJoinAndSelect('assessment.organisationUnits', 'organisationUnits')
      .where('innovation.id = :innovationId', { innovationId })
      .orderBy('assessment.createdAt', 'DESC') // Not needed, but it doesn't do any harm.
      .getOne();
    if (!assessment) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_ASSESSMENT_NOT_FOUND);
    }

    const result = await connection.transaction(async transaction => {
      // 0. Restore old supports if they exist and innovation is ARCHIVED
      // 1. Update the innovation status to WAITING_NEEDS_ASSESSMENT
      // 2. Sync the changes on the documents (update submitted with the draft changes)
      // 3. Soft deletes the previous assessment record
      // 4. Create a new assessment record copied from the previously soft deleted one and sets deleted_at = NULL
      // 5. Create a new reassessment record
      // 6. Create an activity log for the reassessment
      // 7. Sends notifications

      const now = new Date();

      if (
        innovation &&
        innovation.status === InnovationStatusEnum.ARCHIVED &&
        innovation.innovationSupports.length > 0
      ) {
        await transaction.save(
          InnovationSupportEntity,
          innovation.innovationSupports
            .filter(support => support.archiveSnapshot !== null)
            .map(support => {
              const snapshot = support.archiveSnapshot;
              if (snapshot) {
                support.status =
                  snapshot.status !== InnovationSupportStatusEnum.ENGAGING
                    ? snapshot.status
                    : InnovationSupportStatusEnum.UNASSIGNED;
                support.userRoles =
                  snapshot.status === InnovationSupportStatusEnum.WAITING
                    ? snapshot.assignedAccessors.map(id => UserRoleEntity.new({ id }))
                    : [];
              }
              support.archiveSnapshot = null;
              return support;
            })
        );
      }

      await this.documentService.syncDocumentVersions(domainContext, innovationId, transaction, { updatedAt: now });

      await transaction.softDelete(InnovationAssessmentEntity, { id: assessment.id });

      const assessmentClone = await transaction.save(
        InnovationAssessmentEntity,
        (({
          id,
          finishedAt,
          createdAt,
          createdBy,
          updatedAt,
          updatedBy,
          deletedAt,
          assignTo,
          exemptedAt,
          exemptedReason,
          exemptedMessage,
          ...item
        }) => ({ ...item, createdBy: domainContext.id, updatedBy: domainContext.id }))(assessment) // Clones assessment variable, without some keys (id, finishedAt, ...).
      );

      await transaction.update(
        InnovationEntity,
        { id: assessment.innovation.id },
        {
          lastAssessmentRequestAt: now,
          status: InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT,
          statusUpdatedAt: now,
          archivedStatus: null,
          archiveReason: null,
          updatedBy: assessmentClone.createdBy,
          currentAssessment: { id: assessmentClone.id }
        }
      );

      const reassessment = await transaction.save(
        InnovationReassessmentRequestEntity,
        InnovationReassessmentRequestEntity.new({
          assessment: InnovationAssessmentEntity.new({ id: assessmentClone.id }),
          innovation: InnovationEntity.new({ id: innovationId }),
          ...('updatedInnovationRecord' in data ? { updatedInnovationRecord: data.updatedInnovationRecord } : {}),
          description: data.description,
          createdBy: assessmentClone.createdBy,
          updatedBy: assessmentClone.updatedBy
        })
      );

      await this.domainService.innovations.addActivityLog(
        transaction,
        {
          innovationId: assessment.innovation.id,
          activity: ActivityEnum.NEEDS_ASSESSMENT_REASSESSMENT_REQUESTED,
          domainContext
        },
        { assessment: { id: assessmentClone.id }, reassessment: { id: reassessment.id } }
      );

      return { assessment: { id: assessmentClone.id }, reassessment: { id: reassessment.id } };
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

    const newAssessor = await connection
      .createQueryBuilder(UserEntity, 'user')
      .innerJoinAndSelect('user.serviceRoles', 'serviceRoles')
      .where('user.id = :assessorId', { assessorId })
      .andWhere('serviceRoles.role = :serviceRoleType', {
        serviceRoleType: ServiceRoleEnum.ASSESSMENT
      })
      .getOne();

    if (!newAssessor) {
      throw new NotFoundError(UserErrorsEnum.USER_SQL_NOT_FOUND);
    }

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

    const previousAssessor = assessment.assignTo;

    const updatedAssessment = await connection.transaction(async transaction => {
      await transaction.update(InnovationAssessmentEntity, { id: assessment.id }, { assignTo: newAssessor });

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
}
