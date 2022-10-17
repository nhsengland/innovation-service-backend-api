import { inject, injectable } from 'inversify';
import type { Repository } from 'typeorm';

import { DomainServiceType, DomainServiceSymbol } from '@innovations/shared/services';

import {
  InnovationEntity,
  InnovationAssessmentEntity,
  OrganisationEntity,
  OrganisationUnitEntity,
  CommentEntity,
  UserEntity,
} from '@innovations/shared/entities';

import type {
  OrganisationWithUnitsType,
} from '@innovations/shared/types';

import {
  InnovationStatusEnum,
  ActivityEnum,
} from '@innovations/shared/enums'

import {
  InnovationErrorsEnum,
  NotFoundError,
  InternalServerError,
  GenericErrorsEnum,
  UnprocessableEntityError,
} from '@innovations/shared/errors';

import { BaseAppService } from './base-app.service';
import { InnovationHelper } from '../_helpers/innovation.helper';

import type { InnovationAssessmentType } from '../_types/innovation.types';


@injectable()
export class InnovationAssessmentsService extends BaseAppService {

  innovationRepository: Repository<InnovationEntity>;
  innovationAssessmentRepository: Repository<InnovationAssessmentEntity>;
  organisationRepository: Repository<OrganisationEntity>;
  organisationUnitRepository: Repository<OrganisationUnitEntity>;

  constructor(
    @inject(DomainServiceSymbol) private domainService: DomainServiceType
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
    const usersInfo = (await this.domainService.users.getUsersList({ userIds: [assessment.assignTo.id] }));

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
        )
      };

    } catch (error) {
      throw new InternalServerError(GenericErrorsEnum.UNKNOWN_ERROR);
    }

  }


  async createInnovationAssessment(
    user: { id: string },
    innovationId: string,
    data: { comment: string }
  ): Promise<{ id: string }> {

    const assessmentsCount = await this.innovationAssessmentRepository.createQueryBuilder('assessment')
      .where('assessment.innovation_id = :innovationId', { innovationId })
      .getCount();
    if (assessmentsCount > 0) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_ASSESSMENT_ALREADY_EXISTS);
    }


    return this.sqlConnection.transaction(async transaction => {

      const comment = await transaction.save(CommentEntity, CommentEntity.new({
        user: UserEntity.new({ id: user.id }),
        innovation: InnovationEntity.new({ id: innovationId }),
        message: data.comment,
        createdBy: user.id,
        updatedBy: user.id
      }));

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

      await this.domainService.innovations.addActivityLog<'NEEDS_ASSESSMENT_START'>(
        transaction,
        { userId: user.id, innovationId: innovationId, activity: ActivityEnum.NEEDS_ASSESSMENT_START },
        {
          comment: { id: comment['id'], value: comment['message'] }
        }
      );

      return { id: assessment['id'] };

    });

  }



  async updateInnovationAssessment(
    user: { id: string },
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

    // TODO: this code was used for notifications.
    // Keeping it here for now!
    // Current organisation Units suggested on the assessment
    // const currentUnits = dbAssessment.organisationUnits.map(item => item.id);

    // gets the difference between the currentUnits on the assessment and the units being suggested by this assessment update
    // most of the times it will be a 100% diff.
    // let organisationSuggestionsDiff = [];
    // if (dbAssessment.organisationUnits) {
    // const organisationSuggestionsDiff = dbAssessment.organisationUnits.filter(ou => !currentUnits.includes(ou.id));
    // }


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

        const organisationUnits = await this.organisationUnitRepository.findByIds(dbAssessment.organisationUnits.map(ou => ou.id));

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

    // TODO: Recheck when notification are in place!
    // if (assessment.isSubmission) {
    //   try {
    //     await this.notificationService.create(
    //       requestUser,
    //       NotificationAudience.QUALIFYING_ACCESSORS,
    //       innovationId,
    //       NotificationContextType.INNOVATION,
    //       innovationId,
    //       `Innovation with id ${innovationId} is now available for Qualifying Accessors`
    //     );
    //   } catch (error) {
    //     this.logService.error(
    //       `An error has occured while creating a notification of type ${NotificationContextType.INNOVATION} from ${requestUser.id}`,
    //       error
    //     );
    //   }

    //   // send email to Qualifying Accessors
    //   try {
    //     // maps the units object to only the unit id
    //     const units = suggestedOrganisationUnits.map((u) => u.id);

    //     // gets the qualifying accessors from the organisation units
    //     const qualifyingAccessors = await this.organisationService.findQualifyingAccessorsFromUnits(
    //       units,
    //       innovationId
    //     );

    //     // sends an email notification to those Qualifying Accessors
    //     await this.notificationService.sendEmail(
    //       requestUser,
    //       EmailNotificationTemplate.QA_ORGANISATION_SUGGESTED,
    //       innovationId,
    //       dbAssessment.id,
    //       qualifyingAccessors
    //     );
    //   } catch (error) {
    //     this.logService.error(
    //       `An error has occured while sending an email of type ${EmailNotificationTemplate.QA_ORGANISATION_SUGGESTED}`,
    //       error
    //     );
    //   }

    //   // send email to innovator
    //   try {
    //     const innovation = await this.innovationService.find(innovationId, {
    //       relations: ["owner"],
    //     });

    //     // sends an email notification to the innovation owner
    //     await this.notificationService.sendEmail(
    //       requestUser,
    //       EmailNotificationTemplate.INNOVATORS_NEEDS_ASSESSMENT_COMPLETED,
    //       innovationId,
    //       dbAssessment.id,
    //       [innovation.owner.id],
    //       {
    //         innovation_name: innovation.name,
    //       }
    //     );
    //   } catch (error) {
    //     this.logService.error(
    //       `An error has occured while sending an email of type ${EmailNotificationTemplate.INNOVATORS_NEEDS_ASSESSMENT_COMPLETED}`,
    //       error
    //     );
    //   }

    //   // removes the units that the Innovator agreed to share his innovation with from the suggestions
    //   organisationSuggestionsDiff = organisationSuggestionsDiff.filter(
    //     (ou) => !innovationOrganisationUnitShares.includes(ou)
    //   );

    //   // if there are still any suggestions unmatched with the innovation data sharing, then create a notification for the innovator.
    //   if (
    //     organisationSuggestionsDiff &&
    //     organisationSuggestionsDiff.length > 0
    //   ) {
    //     try {
    //       await this.notificationService.create(
    //         requestUser,
    //         NotificationAudience.INNOVATORS,
    //         innovationId,
    //         NotificationContextType.DATA_SHARING,
    //         innovationId,
    //         `Innovation with id ${innovationId} has received Data sharing suggestions from the needs assessment team`
    //       );
    //     } catch (error) {
    //       this.logService.error(
    //         `An error has occured while creating a notification of type ${NotificationContextType.DATA_SHARING} from ${requestUser.id}`,
    //         error
    //       );
    //     }
    //   }
    // }

    return { id: result['id'] };

  }

}
