import { inject, injectable } from 'inversify';
import type { Repository } from 'typeorm';

import { DomainServiceSymbol, DomainServiceType, NotifierServiceSymbol, NotifierServiceType } from '@innovations/shared/services';

import {
  InnovationAssessmentEntity, InnovationEntity, OrganisationEntity,
  OrganisationUnitEntity,
  UserEntity
} from '@innovations/shared/entities';

import type {
  DomainUserInfoType,
  OrganisationWithUnitsType
} from '@innovations/shared/types';

import {
  ActivityEnum, InnovationStatusEnum, InnovationSupportStatusEnum, NotifierTypeEnum, ThreadContextTypeEnum, YesOrNoCatalogueEnum
} from '@innovations/shared/enums';

import {
  GenericErrorsEnum, InnovationErrorsEnum, InternalServerError, NotFoundError, UnprocessableEntityError
} from '@innovations/shared/errors';

import { InnovationHelper } from '../_helpers/innovation.helper';
import { BaseService } from './base.service';

import { InnovationReassessmentRequestEntity } from '@innovations/shared/entities/innovation/innovation-reassessment-request.entity';
import type { InnovationAssessmentType } from '../_types/innovation.types';
import { InnovationThreadsServiceSymbol, InnovationThreadsServiceType } from './interfaces';

@injectable()
export class InnovationAssessmentsService extends BaseService {

  innovationRepository: Repository<InnovationEntity>;
  innovationAssessmentRepository: Repository<InnovationAssessmentEntity>;
  organisationRepository: Repository<OrganisationEntity>;
  organisationUnitRepository: Repository<OrganisationUnitEntity>;

  constructor(
    @inject(DomainServiceSymbol) private domainService: DomainServiceType,
    @inject(InnovationThreadsServiceSymbol) private threadService: InnovationThreadsServiceType,
    @inject(NotifierServiceSymbol) private notifierService: NotifierServiceType,
  ) {
    super();
    this.innovationRepository = this.sqlConnection.getRepository<InnovationEntity>(InnovationEntity);
    this.innovationAssessmentRepository = this.sqlConnection.getRepository<InnovationAssessmentEntity>(InnovationAssessmentEntity);
    this.organisationRepository = this.sqlConnection.getRepository<OrganisationEntity>(OrganisationEntity);
    this.organisationUnitRepository = this.sqlConnection.getRepository<OrganisationUnitEntity>(OrganisationUnitEntity);
  }

  async getInnovationAssessmentInfo(assessmentId: string): Promise<InnovationAssessmentType & { suggestedOrganisations: OrganisationWithUnitsType[] }> {

    const query = this.innovationAssessmentRepository.createQueryBuilder('assessment')
      .innerJoinAndSelect('assessment.assignTo', 'assignTo')
      .leftJoinAndSelect('assessment.organisationUnits', 'organisationUnit')
      .leftJoinAndSelect('organisationUnit.organisation', 'organisation')
      .where('assessment.id = :assessmentId', { assessmentId });

    const assessment = await query.getOne();
    if (!assessment) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_ASSESSMENT_NOT_FOUND);
    }

    // Fetch users names.
    const usersInfo = (await this.domainService.users.getUsersList({ userIds: [assessment.assignTo.id, assessment.updatedBy] }));

    try {

      return {
        id: assessment.id,
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

    } catch (error) {
      throw new InternalServerError(GenericErrorsEnum.UNKNOWN_ERROR);
    }

  }

  async createInnovationAssessment(
    user: DomainUserInfoType,
    innovationId: string,
    data: { message: string }
  ): Promise<{ id: string }> {

    const assessmentsCount = await this.innovationAssessmentRepository.createQueryBuilder('assessment')
      .where('assessment.innovation_id = :innovationId', { innovationId })
      .getCount();
    if (assessmentsCount > 0) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_ASSESSMENT_ALREADY_EXISTS);
    }


    return this.sqlConnection.transaction(async transaction => {

      await transaction.update(InnovationEntity,
        { id: innovationId },
        { status: InnovationStatusEnum.NEEDS_ASSESSMENT }
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
        innovationId,
        'Needs Assessment started',
        data.message,
        assessment.id,
        ThreadContextTypeEnum.NEEDS_ASSESSMENT,
        transaction,
        true,
      )

      await this.domainService.innovations.addActivityLog<'NEEDS_ASSESSMENT_START'>(
        transaction,
        { userId: user.id, innovationId: innovationId, activity: ActivityEnum.NEEDS_ASSESSMENT_START },
        {
          comment: { id: thread.thread.id, value: data.message }
        }
      );

      return { id: assessment['id'] };

    });

  }

  async updateInnovationAssessment(
    user: DomainUserInfoType,
    innovationId: string,
    assessmentId: string,
    data: Partial<Omit<InnovationAssessmentType, 'id'>> & { isSubmission: boolean, suggestedOrganisationUnitsIds?: string[] }
  ): Promise<{ id: string }> {

    const dbAssessment = await this.innovationAssessmentRepository.createQueryBuilder('assessment')
      .leftJoinAndSelect('assessment.organisationUnits', 'organisationUnits')
      .where('assessment.id = :assessmentId', { assessmentId })
      .getOne()
    if (!dbAssessment) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_ASSESSMENT_NOT_FOUND);
    }

    // Obtains organisation's units that the innovator agreed to share his innovation with
    let innovationOrganisationUnitShares: string[] = [];
    const sharedOrganisations = await this.organisationRepository.createQueryBuilder('organisation')
      .innerJoin('organisation.innovationShares', 'innovation')
      .innerJoin('organisation.organisationUnits', 'organisationUnits')
      .where('innovation.id = :innovationId', { innovationId })
      .getMany();

    for (const sharedOrganisation of sharedOrganisations) {
      const sharedOrganisationUnits = await sharedOrganisation.organisationUnits;
      innovationOrganisationUnitShares = [...innovationOrganisationUnitShares, ...sharedOrganisationUnits.map(item => item.id)];
    }

    const result = await this.sqlConnection.transaction(async transaction => {

      if (data.isSubmission && !dbAssessment.finishedAt) {

        dbAssessment.finishedAt = new Date().toISOString();

        await transaction.update(InnovationEntity,
          { id: innovationId },
          { status: InnovationStatusEnum.IN_PROGRESS, updatedBy: user.id }
        );

        await this.domainService.innovations.addActivityLog<'NEEDS_ASSESSMENT_COMPLETED'>(
          transaction,
          { userId: user.id, innovationId: innovationId, activity: ActivityEnum.NEEDS_ASSESSMENT_COMPLETED },
          {
            assessmentId: dbAssessment.id
          }
        );

      }


      // Update assessment record.
      for (const assessmentKey in data) {
        if (assessmentKey in dbAssessment) {
          (dbAssessment as any)[assessmentKey] = (data as any)[assessmentKey]; // TODO: Not pretty! Try to improve in the future.
        }
      }
      dbAssessment.updatedBy = user.id;

      if (data.suggestedOrganisationUnitsIds) {
        dbAssessment.organisationUnits = data.suggestedOrganisationUnitsIds.map(id => OrganisationUnitEntity.new({ id }));
      }

      const savedAssessment = await transaction.save(InnovationAssessmentEntity, dbAssessment);


      // TODO: Should we log ONLY the new suggested units?
      // If any was suggested on a previous update, should it also be logged here?
      if (dbAssessment.organisationUnits.length > 0) {

        const organisationUnits = await this.sqlConnection.createQueryBuilder(OrganisationUnitEntity, 'organisationUnit')
          .where('organisationUnit.id IN (:...ids)', { ids: dbAssessment.organisationUnits.map(ou => ou.id) })
          .getMany();

        await this.domainService.innovations.addActivityLog<'ORGANISATION_SUGGESTION'>(
          transaction,
          { userId: user.id, innovationId: innovationId, activity: ActivityEnum.ORGANISATION_SUGGESTION },
          {
            organisations: organisationUnits.map(item => item.id)
          }
        );

      }

      return savedAssessment;

    });

    if (data.isSubmission && dbAssessment.finishedAt) {
      await this.notifierService.send<NotifierTypeEnum.NEEDS_ASSESSMENT_COMPLETED>(
        user,
        NotifierTypeEnum.NEEDS_ASSESSMENT_COMPLETED,
        { innovationId: innovationId, assessmentId: assessmentId, organisationUnitIds: data.suggestedOrganisationUnitsIds || [] }
      )
    }

    return { id: result['id'] };

  }

  /**
   * 
   * @param requestUser - The user requesting the action. In this case, it's an innovator.
   * @param assessmentId - The assessment id to be cloned and closed.
   * @param data - The data to be used to create the new assessment request.
   * @returns - The assessment request id and the new assessment id.
   */
  async requestReassessment(
    requestUser: DomainUserInfoType,
    innovationId: string,
    data: { updatedInnovationRecord: YesOrNoCatalogueEnum, description: string },
  ): Promise<{ assessment: { id: string }, reassessment: { id: string } }> {

    // Within a transaction
    // 1. Update the innovation status to NEEDS_ASSESSMENT
    // 2. Create a new assessment record copied from the previous one
    // 3. Soft deletes the previous assessment record
    // 4. Create a new reassessment record
    // 5. Create an activity log for the reassessment
    // 6. Sends an in-app notification to the needs assessment team

    // Get the latest assessment record

    // if it has at least one ongoing support, cannot request reassessment
    const hasOngoingSupport = await this.sqlConnection.createQueryBuilder(InnovationEntity, 'innovation')
      .innerJoin('innovation.innovationSupports', 'supports')
      .where('innovation.id = :innovationId', { innovationId })
      .andWhere('innovation.status = :innovationStatus', { innovationStatus: InnovationStatusEnum.IN_PROGRESS })
      .andWhere('supports.status in (:...supportStatus)', { supportStatus: [InnovationSupportStatusEnum.ENGAGING, InnovationSupportStatusEnum.FURTHER_INFO_REQUIRED] })
      .limit(1)
      .getOne();

    if (hasOngoingSupport) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_CANNOT_REQUEST_REASSESSMENT);
    }

    const assessment = await this.sqlConnection.createQueryBuilder(InnovationAssessmentEntity, 'assessment')
      .innerJoinAndSelect('assessment.innovation', 'innovation')
      .innerJoinAndSelect('assessment.assignTo', 'assignTo')
      .where('innovation.id = :innovationId', { innovationId })
      .orderBy('assessment.createdAt', 'DESC')
      .limit(1)
      .getOne();

    if (!assessment) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_ASSESSMENT_NOT_FOUND);
    }

    const result = await this.sqlConnection.transaction(async transaction => {

      await transaction.update(InnovationEntity,
        { id: assessment.innovation.id },
        { status: InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT, updatedBy: assessment.createdBy }
      );

      const reassessment = await transaction.save(InnovationReassessmentRequestEntity, InnovationReassessmentRequestEntity.new({
        assessment: InnovationAssessmentEntity.new({ id: assessment.id }),
        innovation: InnovationEntity.new({ id: innovationId }),
        updatedInnovationRecord: data.updatedInnovationRecord,
        description: data.description,
        createdBy: assessment.createdBy,
        updatedBy: assessment.createdBy
      }));

      await transaction.softDelete(InnovationAssessmentEntity, { id: assessment.id });

      // @ts-expect-error - Need to remove the `id` property from the object to create a copy of the previous record
      delete assessment.id
      assessment.finishedAt = null;


      const newAssessment = await transaction.save(InnovationAssessmentEntity, assessment);

      await this.domainService.innovations.addActivityLog<'NEEDS_ASSESSMENT_REASSESSMENT_REQUESTED'>(
        transaction,
        { userId: requestUser.id, innovationId: assessment.innovation.id, activity: ActivityEnum.NEEDS_ASSESSMENT_REASSESSMENT_REQUESTED },
        {
          assessment: { id: assessment.id },
          reassessmentRequest: { id: reassessment.id },
        }
      );

      return { reassessment: { id: reassessment.id }, assessment: { id: newAssessment.id } };
    });

    // add notification with Innovation submited for needs assessment
    await this.notifierService.send<NotifierTypeEnum.INNOVATION_SUBMITED>(
      requestUser,
      NotifierTypeEnum.INNOVATION_SUBMITED,
      { innovationId: assessment.innovation.id }
    );

    return { assessment: { id: result.assessment.id }, reassessment: { id: result.reassessment.id } };
  }
}
