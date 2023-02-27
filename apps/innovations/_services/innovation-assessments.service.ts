import { inject, injectable } from 'inversify';

import { InnovationAssessmentEntity, InnovationEntity, InnovationReassessmentRequestEntity, OrganisationEntity, OrganisationUnitEntity, UserEntity } from '@innovations/shared/entities';
import { ActivityEnum, InnovationStatusEnum, InnovationSupportStatusEnum, MaturityLevelCatalogueEnum, NotifierTypeEnum, ServiceRoleEnum, ThreadContextTypeEnum, YesOrNoCatalogueEnum, YesPartiallyNoCatalogueEnum } from '@innovations/shared/enums';
import { InnovationErrorsEnum, NotFoundError, UnprocessableEntityError, UserErrorsEnum } from '@innovations/shared/errors';
import { DomainServiceSymbol, DomainServiceType, NotifierServiceSymbol, NotifierServiceType } from '@innovations/shared/services';
import type { DomainContextType } from '@innovations/shared/types';

import { InnovationHelper } from '../_helpers/innovation.helper';
import type { InnovationAssessmentType } from '../_types/innovation.types';

import type { EntityManager } from 'typeorm';
import { BaseService } from './base.service';
import { InnovationThreadsServiceSymbol, InnovationThreadsServiceType } from './interfaces';


@injectable()
export class InnovationAssessmentsService extends BaseService {

  constructor(
    @inject(DomainServiceSymbol) private domainService: DomainServiceType,
    @inject(InnovationThreadsServiceSymbol) private threadService: InnovationThreadsServiceType,
    @inject(NotifierServiceSymbol) private notifierService: NotifierServiceType
  ) { super(); }


  async getInnovationAssessmentInfo(assessmentId: string, entityManager?: EntityManager): Promise<InnovationAssessmentType> {
    
    const connection = entityManager ?? this.sqlConnection.manager;

    const assessment = await connection.createQueryBuilder(InnovationAssessmentEntity, 'assessment')
      .innerJoinAndSelect('assessment.assignTo', 'assignTo')
      .leftJoinAndSelect('assessment.organisationUnits', 'organisationUnit')
      .leftJoinAndSelect('organisationUnit.organisation', 'organisation')
      // Deleted assessments are necessary for history / activity log purposes.
      // This query will retrieve deleted records from InnovationAssessmentEntity and InnovationReassessmentRequestEntity.
      .withDeleted()
      .leftJoinAndSelect('assessment.reassessmentRequest', 'reassessmentRequest')
      .where('assessment.id = :assessmentId', { assessmentId })
      .getOne();
    if (!assessment) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_ASSESSMENT_NOT_FOUND);
    }

    // Fetch users names.
    const usersInfo = (await this.domainService.users.getUsersList({ userIds: [assessment.assignTo.id, assessment.updatedBy] }));

    return {
      id: assessment.id,
      ...(!assessment.reassessmentRequest ? {} : { reassessment: { updatedInnovationRecord: assessment.reassessmentRequest.updatedInnovationRecord, description: assessment.reassessmentRequest.description } }),
      summary: assessment.summary,
      description: assessment.description,
      finishedAt: assessment.finishedAt,
      assignTo: { id: assessment.assignTo.id, name: usersInfo.find(user => user.id === assessment.assignTo.id)?.displayName || '' },
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
          id: item.id, name: item.name, acronym: item.acronym,
          organisation: { id: item.organisation.id, name: item.organisation.name, acronym: item.organisation.acronym }
        }))
      ),
      updatedAt: assessment.updatedAt,
      updatedBy: { id: assessment.updatedBy, name: usersInfo.find(user => user.id === assessment.updatedBy)?.displayName || '' }
    };

  }

  async createInnovationAssessment(
    user: { id: string, identityId: string },
    domainContext: DomainContextType,
    innovationId: string,
    data: { message: string; },
    entityManager?: EntityManager
  ): Promise<{ id: string; }> {

    const connection = entityManager ?? this.sqlConnection.manager;

    const assessmentsCount = await connection.createQueryBuilder(InnovationAssessmentEntity, 'assessment')
      .where('assessment.innovation_id = :innovationId', { innovationId })
      .getCount();
    if (assessmentsCount > 0) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_ASSESSMENT_ALREADY_EXISTS);
    }

    return connection.transaction(async transaction => {

      await transaction.update(InnovationEntity,
        { id: innovationId },
        {
          status: InnovationStatusEnum.NEEDS_ASSESSMENT,
          statusUpdatedAt: new Date().toISOString()
        }
      );

      const assessment = await transaction.save(InnovationAssessmentEntity, InnovationAssessmentEntity.new({
        description: '', // assessment.description,
        innovation: InnovationEntity.new({ id: innovationId }),
        assignTo: UserEntity.new({ id: user.id }),
        createdBy: user.id,
        updatedBy: user.id
      }));

      const thread = await this.threadService.createThreadOrMessage(
        user,
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
        { innovationId: innovationId, activity: ActivityEnum.NEEDS_ASSESSMENT_START, domainContext },
        { comment: { id: thread.thread.id, value: data.message } }
      );

      await this.notifierService.send(
        user,
        NotifierTypeEnum.NEEDS_ASSESSMENT_STARTED,
        { innovationId, threadId: thread.thread.id },
        domainContext,
      );

      return { id: assessment['id'] };

    });

  }

  async updateInnovationAssessment(
    user: { id: string, identityId: string },
    domainContext: DomainContextType,
    innovationId: string,
    assessmentId: string,
    data: {
      summary?: null | string,
      description?: null | string,
      maturityLevel?: null | MaturityLevelCatalogueEnum,
      maturityLevelComment?: null | string,
      hasRegulatoryApprovals?: null | YesPartiallyNoCatalogueEnum,
      hasRegulatoryApprovalsComment?: null | string,
      hasEvidence?: null | YesPartiallyNoCatalogueEnum,
      hasEvidenceComment?: null | string,
      hasValidation?: null | YesPartiallyNoCatalogueEnum,
      hasValidationComment?: null | string,
      hasProposition?: null | YesPartiallyNoCatalogueEnum,
      hasPropositionComment?: null | string,
      hasCompetitionKnowledge?: null | YesPartiallyNoCatalogueEnum,
      hasCompetitionKnowledgeComment?: null | string,
      hasImplementationPlan?: null | YesPartiallyNoCatalogueEnum,
      hasImplementationPlanComment?: null | string,
      hasScaleResource?: null | YesPartiallyNoCatalogueEnum,
      hasScaleResourceComment?: null | string,
      suggestedOrganisationUnitsIds?: string[],
      isSubmission?: boolean
    },
    entityManager?: EntityManager
  ): Promise<{ id: string; }> {

    const connection = entityManager ?? this.sqlConnection.manager;

    const innovation = await connection.createQueryBuilder(InnovationEntity, 'innovation')
    .where('innovation.id = :innovationId', { innovationId })
    .getOne();

    if (!innovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    const dbAssessment = await connection.createQueryBuilder(InnovationAssessmentEntity, 'assessment')
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

      assessment.updatedBy = user.id;

      if (data.suggestedOrganisationUnitsIds) {
        assessment.organisationUnits = data.suggestedOrganisationUnitsIds.map(id => OrganisationUnitEntity.new({ id }));
      }

      // Following operations are only applied when submitting the assessment.
      if (data.isSubmission) {

        assessment.finishedAt = new Date().toISOString();

        // If it's first assessment submission
        if (!dbAssessment.finishedAt) {

          await transaction.update(InnovationEntity,
            { id: innovationId },
            {
              status: InnovationStatusEnum.IN_PROGRESS,
              statusUpdatedAt: new Date().toISOString(),
              updatedBy: user.id
            }
          );

          await this.domainService.innovations.addActivityLog(
            transaction,
            { innovationId: innovationId, activity: ActivityEnum.NEEDS_ASSESSMENT_COMPLETED, domainContext },
            { assessmentId: assessment.id }
          );

          // if it's editing an already submitted assessment
        } else {
          await this.domainService.innovations.addActivityLog(
            transaction,
            { innovationId: innovationId, activity: ActivityEnum.NEEDS_ASSESSMENT_EDITED, domainContext },
            { assessmentId: assessment.id }
          );
        }

        // Add suggested organisations (NOT units) names to activity log.
        if ((data.suggestedOrganisationUnitsIds ?? []).length > 0) {

          const organisations = await this.sqlConnection.createQueryBuilder(OrganisationEntity, 'organisation')
            .distinct()
            .innerJoin('organisation.organisationUnits', 'organisationUnits')
            .where('organisationUnits.id IN (:...ids)', { ids: assessment.organisationUnits.map(ou => ou.id) })
            .andWhere('organisation.inactivated_at IS NULL')
            .andWhere('organisationUnits.inactivated_at IS NULL')
            .getMany();

          await this.domainService.innovations.addActivityLog(
            transaction,
            { innovationId: innovationId, activity: ActivityEnum.ORGANISATION_SUGGESTION, domainContext },
            { organisations: organisations.map(item => item.name) }
          );

        }

      } else { // it's draft
        // if the innovation has a reassessment request and is in state WAITING_NEEDS_ASSESSMENT
        // change innovation state to NEEDS_ASSESSMENT
        if (dbAssessment.reassessmentRequest && innovation.status === InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT) {
          await transaction.update(InnovationEntity,
            { id: innovationId },
            {
              status: InnovationStatusEnum.NEEDS_ASSESSMENT,
              statusUpdatedAt: new Date().toISOString(),
              updatedBy: user.id
            }
          );
        }
      }

      const savedAssessment = await transaction.save(InnovationAssessmentEntity, assessment);

      return { id: savedAssessment.id };

    });


    if (data.isSubmission && !dbAssessment.finishedAt) {
      await this.notifierService.send(
        { id: user.id, identityId: user.identityId },
        NotifierTypeEnum.NEEDS_ASSESSMENT_COMPLETED,
        { innovationId: innovationId, assessmentId: assessmentId, organisationUnitIds: data.suggestedOrganisationUnitsIds || [] },
        domainContext,
      );
    }

    return { id: result.id };

  }


  /**
   * @param user - The user requesting the action. In this case, it's an innovator.
   * @param innovationId
   * @param data - The data to be used to create the new assessment request.
   * @returns - The assessment request id and the new assessment id.
   */
  async createInnovationReassessment(
    user: { id: string, identityId: string },
    domainContext: DomainContextType,
    innovationId: string,
    data: { updatedInnovationRecord: YesOrNoCatalogueEnum, description: string; },
    entityManager?: EntityManager
  ): Promise<{ assessment: { id: string; }, reassessment: { id: string; }; }> {

    const connection = entityManager ?? this.sqlConnection.manager;

    // If it has at least one ongoing support, cannot request reassessment.
    const hasOngoingSupports = await connection.createQueryBuilder(InnovationEntity, 'innovation')
      .innerJoin('innovation.innovationSupports', 'supports')
      .where('innovation.id = :innovationId', { innovationId })
      .andWhere('innovation.status = :innovationStatus', { innovationStatus: InnovationStatusEnum.IN_PROGRESS })
      .andWhere('supports.status IN (:...supportStatus)', { supportStatus: [InnovationSupportStatusEnum.ENGAGING, InnovationSupportStatusEnum.FURTHER_INFO_REQUIRED] })
      .getCount();
    if (hasOngoingSupports > 0) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_CANNOT_REQUEST_REASSESSMENT);
    }

    // Get the latest assessment record.
    const assessment = await connection.createQueryBuilder(InnovationAssessmentEntity, 'assessment')
      .innerJoinAndSelect('assessment.innovation', 'innovation')
      .innerJoinAndSelect('assessment.assignTo', 'assignTo')
      .leftJoinAndSelect('assessment.organisationUnits', 'organisationUnits')
      .where('innovation.id = :innovationId', { innovationId })
      .orderBy('assessment.createdAt', 'DESC') // Not needed, but it doesn't do any harm.
      .getOne();
    if (!assessment) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_ASSESSMENT_NOT_FOUND);
    }

    const result = await connection.transaction(async transaction => {

      // 1. Update the innovation status to WAITING_NEEDS_ASSESSMENT
      // 2. Create a new assessment record copied from the previous one
      // 3. Create a new reassessment record
      // 4. Soft deletes the previous assessment record
      // 5. Create an activity log for the reassessment
      // 6. Sends notifications

      await transaction.update(InnovationEntity,
        { id: assessment.innovation.id },
        {
          status: InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT,
          statusUpdatedAt: new Date().toISOString(),
          updatedBy: assessment.createdBy
        }
      );

      const assessmentClone = await transaction.save(InnovationAssessmentEntity,
        (({
          id, finishedAt, createdAt, updatedAt, deletedAt,
          ...item
        }) => item)(assessment) // Clones assessment variable, without some keys (id, finishedAt, ...).
      );

      const reassessment = await transaction.save(InnovationReassessmentRequestEntity, InnovationReassessmentRequestEntity.new({
        assessment: InnovationAssessmentEntity.new({ id: assessmentClone.id }),
        innovation: InnovationEntity.new({ id: innovationId }),
        updatedInnovationRecord: data.updatedInnovationRecord,
        description: data.description,
        createdBy: assessmentClone.createdBy,
        updatedBy: assessmentClone.updatedBy
      }));

      await transaction.softDelete(InnovationAssessmentEntity, { id: assessment.id });

      await this.domainService.innovations.addActivityLog(
        transaction,
        { innovationId: assessment.innovation.id, activity: ActivityEnum.NEEDS_ASSESSMENT_REASSESSMENT_REQUESTED, domainContext },
        { assessment: { id: assessmentClone.id }, reassessment: { id: reassessment.id } }
      );

      return { assessment: { id: assessmentClone.id }, reassessment: { id: reassessment.id } };

    });

    await this.notifierService.send(
      { id: user.id, identityId: user.identityId },
      NotifierTypeEnum.INNOVATION_REASSESSMENT_REQUEST,
      { innovationId: innovationId },
      domainContext,
    );

    return { assessment: { id: result.assessment.id }, reassessment: { id: result.reassessment.id } };

  }

  async updateAssessor(
    user: { id: string, identityId: string },
    domainContext: DomainContextType,
    innovationId: string,
    assessmentId: string,
    assessorId: string,
    entityManager?: EntityManager
  ): Promise<{ assessmentId: string, assessorId: string }> {

    const connection = entityManager ?? this.sqlConnection.manager;

    const newAssessor = await connection
      .createQueryBuilder(UserEntity, 'user')
      .innerJoinAndSelect('user.serviceRoles', 'serviceRoles')
      .where('user.id = :assessorId', { assessorId })
      .andWhere('serviceRoles.role = :serviceRoleType', { serviceRoleType: ServiceRoleEnum.ASSESSMENT })
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
      await transaction.update(
        InnovationAssessmentEntity,
        { id: assessment.id },
        { assignTo: newAssessor }
      );

      return {
        id: assessment.id,
        newAssessor: { id: newAssessor.id, identityId: newAssessor.identityId }
      };

    });

    await this.notifierService.send(
      { id: user.id, identityId: user.identityId },
      NotifierTypeEnum.NEEDS_ASSESSMENT_ASSESSOR_UPDATE,
      {
        innovationId,
        assessmentId: updatedAssessment.id,
        previousAssessor: { identityId: previousAssessor.identityId },
        newAssessor: { identityId: updatedAssessment.newAssessor.identityId }
      },
      domainContext,
    );

    return { assessmentId: updatedAssessment.id, assessorId: updatedAssessment.newAssessor.id };

  }

}
