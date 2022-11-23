import { InnovationActionEntity, InnovationEntity, InnovationSupportEntity } from '@users/shared/entities';
import { AccessorOrganisationRoleEnum, InnovationActionStatusEnum, InnovationStatusEnum, InnovationSupportStatusEnum } from '@users/shared/enums';
import { OrganisationErrorsEnum, UnprocessableEntityError } from '@users/shared/errors';
import type { DateISOType, DomainUserInfoType } from '@users/shared/types';
import { injectable } from 'inversify';
import { BaseService } from './base.service';

@injectable()
export class StatisticsService  extends BaseService {

  constructor() {
    super();
  }

  async waitingAssessment(): Promise<{count: number, overdue: number}> {

    const query = await this.sqlConnection.createQueryBuilder(InnovationEntity, 'innovation')
      .leftJoinAndSelect('innovation.assessments', 'assessments')
      .where('innovation.status IN (:...assessmentInnovationStatus)', { assessmentInnovationStatus: [InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT] })
      .getCount();


    const overdueCount = await this.sqlConnection.createQueryBuilder(InnovationEntity, 'innovation')
      .leftJoinAndSelect('innovation.assessments', 'assessments')
      .where('innovation.status IN (:...assessmentInnovationStatus)', { assessmentInnovationStatus: [InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT] })
      .andWhere(`DATEDIFF(day, innovation.submitted_at, GETDATE()) > 7 AND assessments.finished_at IS NULL`)
      .getCount();

    return {
      count: query,
      overdue: overdueCount
    }
  }


 async assignedInnovations(userId: string): Promise<{count: number; total: number; overdue: number}> {

  const count = await this.sqlConnection.createQueryBuilder(InnovationEntity, 'innovation')
      .leftJoinAndSelect('innovation.assessments', 'assessments')
      .leftJoinAndSelect('assessments.assignTo', 'assignTo')
      .where('innovation.status IN (:...assessmentInnovationStatus)', { assessmentInnovationStatus: [InnovationStatusEnum.NEEDS_ASSESSMENT] })
      .andWhere('assignTo.id = :userId', { userId })
      .getCount();

    const total = await this.sqlConnection.createQueryBuilder(InnovationEntity, 'innovation')
      .leftJoinAndSelect('innovation.assessments', 'assessments')
      .leftJoinAndSelect('assessments.assignTo', 'assignTo')
      .where('innovation.status IN (:...assessmentInnovationStatus)', { assessmentInnovationStatus: [InnovationStatusEnum.NEEDS_ASSESSMENT] })

      .getCount();

    const overdueCount = await this.sqlConnection.createQueryBuilder(InnovationEntity, 'innovation')
      .leftJoinAndSelect('innovation.assessments', 'assessments')
      .leftJoinAndSelect('assessments.assignTo', 'assignTo')
      .where('innovation.status IN (:...assessmentInnovationStatus)', { assessmentInnovationStatus: [InnovationStatusEnum.NEEDS_ASSESSMENT] })
      .andWhere(`DATEDIFF(day, innovation.submitted_at, GETDATE()) > 7 AND assessments.finished_at IS NULL`)
      .andWhere('assignTo.id = :userId', { userId })
      .getCount();


  return {
    count: count,
    total: total,
    overdue: overdueCount
  }
 }

  async innovationsAssignedToMe(
    requestUser: DomainUserInfoType,
  ): Promise<{count: number, total: number, lastSubmittedAt: null | DateISOType}> {

    const organisationUnit = requestUser.organisations.find(_ => true)?.organisationUnits.find(_ => true);

    if (!organisationUnit) {
      throw new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND);
    }

    const baseQuery = this.sqlConnection.createQueryBuilder(InnovationSupportEntity, 'innovationSupports')
      .innerJoinAndSelect('innovationSupports.organisationUnitUsers', 'organisationUnitUsers')
      .innerJoinAndSelect('organisationUnitUsers.organisationUser', 'organisationUser')
      .innerJoinAndSelect('organisationUser.user', 'user')
      .where('innovationSupports.status = :status', { status: InnovationSupportStatusEnum.ENGAGING })
      .andWhere('organisationUnitUsers.organisation_unit_id = :organisationUnit', { organisationUnit: organisationUnit.id });

    const [myUnitEngagingInnovations, myUnitInnovationsCount] = await baseQuery
      .orderBy('innovationSupports.updated_at', 'DESC')
      .getManyAndCount();

    const myAssignedInnovationsCount = await baseQuery
      .andWhere('user.id = :userId', { userId: requestUser.id })
      .getCount();

    return {
      count: myAssignedInnovationsCount,
      total: myUnitInnovationsCount,
      lastSubmittedAt: myUnitEngagingInnovations.find(_ => true)?.updatedAt || null,
    }
  }

  async actionsToReview(
    requestUser: DomainUserInfoType,
  ): Promise<{count: number, total: number, lastSubmittedAt: null | DateISOType}> {

    const organisationUnit = requestUser.organisations.find(_ => true)?.organisationUnits.find(_ => true)?.id;

    if (!organisationUnit) {
      throw new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND);
    }

    const baseQuery = this.sqlConnection.createQueryBuilder(InnovationActionEntity, 'actions')
      .innerJoinAndSelect('actions.innovationSupport', 'innovationSupport')
      .innerJoinAndSelect('innovationSupport.organisationUnitUsers', 'organisationUnitUsers')
      .innerJoinAndSelect('organisationUnitUsers.organisationUser', 'organisationUser')
      .innerJoinAndSelect('organisationUser.user', 'user')
      .where('actions.status = :status', { status: InnovationActionStatusEnum.IN_REVIEW })
      .andWhere('organisationUnitUsers.organisation_unit_id = :organisationUnit', { organisationUnit })

    const [myUnitActions, myUnitActionsCount] = await baseQuery

      .orderBy('actions.updated_at', 'DESC')
      .getManyAndCount();
      
    const myActionsCount = await baseQuery
      .andWhere('actions.created_by = :userId', { userId: requestUser.id }).getCount();    
  

    return {
      count: myActionsCount,
      total: myUnitActionsCount,
      lastSubmittedAt: myUnitActions.find(_ => true)?.updatedAt || null,
    }
  }

  async innovationsToReview(
    requestUser: DomainUserInfoType,
  ): Promise<{count: number, lastSubmittedAt: null | DateISOType}> {


    const organisationUnit = requestUser.organisations.find(_ => true)?.organisationUnits.find(_ => true)?.id;

    if (!organisationUnit) {
      throw new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND);
    }


    const baseQuery = this.sqlConnection.createQueryBuilder(InnovationEntity, 'innovation')
      .innerJoinAndSelect('innovation.assessments', 'assessments')
      .innerJoinAndSelect('assessments.organisationUnits', 'organisationUnits', 'organisationUnits.id = :organisationUnit', { organisationUnit })
      .innerJoinAndSelect('organisationUnits.organisationUnitUsers', 'organisationUnitUser')
      .innerJoinAndSelect('organisationUnitUser.organisationUser', 'organisationUser', 'organisationUser.role = :role', { role: AccessorOrganisationRoleEnum.QUALIFYING_ACCESSOR })
      .innerJoinAndSelect('organisationUser.user', 'user')
      .leftJoinAndSelect('innovation.innovationSupports', 'innovationSupports', 'innovationSupports.organisation_unit_id = :organisationUnit', { organisationUnit })
      .where('user.id = :userId', { userId: requestUser.id })
      .andWhere('innovationSupports.id IS NULL')
      .andWhere('innovation.status = :status', { status: InnovationStatusEnum.IN_PROGRESS })
      .orderBy('innovation.submitted_at', 'DESC')

    const [myInnovationsToReview, myInnovationsToReviewCount] = await baseQuery.getManyAndCount();
  

    return {
      count: myInnovationsToReviewCount,
      lastSubmittedAt: myInnovationsToReview.find(_ => true)?.submittedAt || null,
    }
  }
}