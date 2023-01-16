import { injectable } from 'inversify';

import { InnovationActionEntity, InnovationEntity, InnovationSupportEntity } from '@users/shared/entities';
import { AccessorOrganisationRoleEnum, InnovationActionStatusEnum, InnovationStatusEnum, InnovationSupportStatusEnum, UserTypeEnum } from '@users/shared/enums';
import { OrganisationErrorsEnum, UnprocessableEntityError } from '@users/shared/errors';
import type { DateISOType, DomainContextType, DomainUserInfoType } from '@users/shared/types';

import { BaseService } from './base.service';


@injectable()
export class StatisticsService extends BaseService {

  constructor() {
    super();
  }

  async waitingAssessment(): Promise<{ count: number, overdue: number }> {

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
    };

  }


  async assignedInnovations(userId: string): Promise<{ count: number; total: number; overdue: number }> {

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
    };

  }

  async innovationsAssignedToMe(
    requestUser: DomainUserInfoType,
    domainContext: DomainContextType,
  ): Promise<{ count: number, total: number, lastSubmittedAt: null | DateISOType }> {

    const organisationUnit = domainContext?.organisation?.organisationUnit?.id;

    if (!organisationUnit) {
      throw new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND);
    }

    const baseQuery = this.sqlConnection.createQueryBuilder(InnovationSupportEntity, 'innovationSupports')
      .innerJoinAndSelect('innovationSupports.organisationUnitUsers', 'organisationUnitUsers')
      .innerJoinAndSelect('organisationUnitUsers.organisationUser', 'organisationUser')
      .innerJoinAndSelect('organisationUser.user', 'user')
      .where('innovationSupports.status = :status', { status: InnovationSupportStatusEnum.ENGAGING })
      .andWhere('organisationUnitUsers.organisation_unit_id = :organisationUnit', { organisationUnit: organisationUnit });

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
    };

  }

  async actionsToReview(
    requestUser: DomainUserInfoType,
    domainContext: DomainContextType,
  ): Promise<{ count: number, total: number, lastSubmittedAt: null | DateISOType }> {

    const organisationUnit = domainContext?.organisation?.organisationUnit?.id;

    if (!organisationUnit) {
      throw new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND);
    }

    const myActionsQuery = this.sqlConnection.createQueryBuilder(InnovationActionEntity, 'actions')
      .select('actions.status', 'status')
      .addSelect('count(*)', 'count')
      .addSelect('MAX(actions.updated_at)', 'lastSubmittedAt')
      .innerJoin('actions.innovationSupport', 'innovationSupport')
      .innerJoin('innovationSupport.organisationUnit', 'orgUnit')
      .where('actions.created_by = :userId', { userId: requestUser.id })
      .andWhere('actions.status IN (:...status)', { status: [InnovationActionStatusEnum.SUBMITTED, InnovationActionStatusEnum.REQUESTED] })

    if (domainContext.userType === UserTypeEnum.ACCESSOR) {
      myActionsQuery.andWhere('orgUnit.id = :orgUnitId', { orgUnitId: organisationUnit })
    }

    const myActionsCount = await myActionsQuery
      .groupBy('actions.status')
      .getRawMany();

    const actions: Record<string, any> = {
      SUBMITTED: { count: 0, lastSubmittedAt: null },
      REQUESTED: { count: 0, lastSubmittedAt: null },
    }
    for (const action of myActionsCount) {
      actions[action.status] = { count: action.count, lastSubmittedAt: action.lastSubmittedAt }
    }

    return {
      count: actions['SUBMITTED'].count,
      total: actions['SUBMITTED'].count + actions['REQUESTED'].count,
      lastSubmittedAt: Object.values(actions).map(_ => _.lastSubmittedAt).sort((a, b) => b - a)[0] || null,
    };

  }

  async innovationsToReview(
    requestUser: DomainUserInfoType,
    domainContext: DomainContextType,
  ): Promise<{ count: number, lastSubmittedAt: null | DateISOType }> {

    const organisationUnit = domainContext?.organisation?.organisationUnit?.id;

    if (!organisationUnit) {
      throw new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND);
    }

    const baseQuery = this.sqlConnection.createQueryBuilder(InnovationEntity, 'innovation')
      .select('count(*)', 'count')
      .addSelect('MAX(innovation.submitted_at)', 'lastSubmittedAt')
      .innerJoin('innovation.assessments', 'assessments')
      .innerJoin('assessments.organisationUnits', 'organisationUnits', 'organisationUnits.id = :organisationUnit', { organisationUnit })
      .innerJoin('organisationUnits.organisationUnitUsers', 'organisationUnitUser')
      .innerJoin('organisationUnitUser.organisationUser', 'organisationUser', 'organisationUser.role = :role', { role: AccessorOrganisationRoleEnum.QUALIFYING_ACCESSOR })
      .innerJoin('organisationUser.user', 'user')
      .innerJoin('innovation.organisationShares', 'organisationShares', 'organisationShares.id = organisationUser.organisation_id')
      .leftJoin('innovation.innovationSupports', 'innovationSupports', 'innovationSupports.organisation_unit_id = :organisationUnit', { organisationUnit })
      .where('user.id = :userId', { userId: requestUser.id })
      .andWhere('innovationSupports.id IS NULL')
      .andWhere('innovation.status = :status', { status: InnovationStatusEnum.IN_PROGRESS })

    const { count, lastSubmittedAt } = await baseQuery.getRawOne();

    return {
      count: count,
      lastSubmittedAt: lastSubmittedAt,
    };

  }

}
