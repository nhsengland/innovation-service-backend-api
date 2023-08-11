import { injectable } from 'inversify';

import { InnovationActionEntity, InnovationEntity, InnovationSupportEntity } from '@users/shared/entities';
import {
  InnovationActionStatusEnum,
  InnovationStatusEnum,
  InnovationSupportLogTypeEnum,
  InnovationSupportStatusEnum,
  ServiceRoleEnum,
  UserStatusEnum
} from '@users/shared/enums';
import { OrganisationErrorsEnum, UnprocessableEntityError } from '@users/shared/errors';
import type { DomainContextType } from '@users/shared/types';

import { BaseService } from './base.service';
import type { EntityManager } from 'typeorm';

@injectable()
export class StatisticsService extends BaseService {
  constructor() {
    super();
  }

  async waitingAssessment(entityManager?: EntityManager): Promise<{ count: number; overdue: number }> {
    const em = entityManager ?? this.sqlConnection.manager;

    const query = await em
      .createQueryBuilder(InnovationEntity, 'innovation')
      .leftJoinAndSelect('innovation.assessments', 'assessments')
      .where('innovation.status IN (:...assessmentInnovationStatus)', {
        assessmentInnovationStatus: [InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT]
      })
      .getCount();

    const overdueCount = await em
      .createQueryBuilder(InnovationEntity, 'innovation')
      .leftJoinAndSelect('innovation.assessments', 'assessments')
      .where('innovation.status IN (:...assessmentInnovationStatus)', {
        assessmentInnovationStatus: [InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT]
      })
      .andWhere(`DATEDIFF(day, innovation.submitted_at, GETDATE()) > 7 AND assessments.finished_at IS NULL`)
      .getCount();

    return {
      count: query,
      overdue: overdueCount
    };
  }

  async assignedInnovations(
    userId: string,
    entityManager?: EntityManager
  ): Promise<{ count: number; total: number; overdue: number }> {
    const em = entityManager ?? this.sqlConnection.manager;

    const count = await em
      .createQueryBuilder(InnovationEntity, 'innovation')
      .leftJoinAndSelect('innovation.assessments', 'assessments')
      .leftJoinAndSelect('assessments.assignTo', 'assignTo')
      .where('innovation.status IN (:...assessmentInnovationStatus)', {
        assessmentInnovationStatus: [InnovationStatusEnum.NEEDS_ASSESSMENT]
      })
      .andWhere('assignTo.id = :userId', { userId })
      .getCount();

    const total = await em
      .createQueryBuilder(InnovationEntity, 'innovation')
      .leftJoinAndSelect('innovation.assessments', 'assessments')
      .leftJoinAndSelect('assessments.assignTo', 'assignTo')
      .where('innovation.status IN (:...assessmentInnovationStatus)', {
        assessmentInnovationStatus: [InnovationStatusEnum.NEEDS_ASSESSMENT]
      })

      .getCount();

    const overdueCount = await em
      .createQueryBuilder(InnovationEntity, 'innovation')
      .leftJoinAndSelect('innovation.assessments', 'assessments')
      .leftJoinAndSelect('assessments.assignTo', 'assignTo')
      .where('innovation.status IN (:...assessmentInnovationStatus)', {
        assessmentInnovationStatus: [InnovationStatusEnum.NEEDS_ASSESSMENT]
      })
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
    domainContext: DomainContextType,
    entityManager?: EntityManager
  ): Promise<{ count: number; total: number; lastSubmittedAt: null | Date }> {
    const organisationUnit = domainContext?.organisation?.organisationUnit?.id;

    if (!organisationUnit) {
      throw new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND);
    }

    const em = entityManager ?? this.sqlConnection.manager;

    const { myUnitInnovationsCount, lastSubmittedAt } = await em
      .createQueryBuilder(InnovationSupportEntity, 'innovationSupports')
      .select('count(*)', 'myUnitInnovationsCount')
      .addSelect('MAX(innovationSupports.updated_at)', 'lastSubmittedAt')
      .where('innovationSupports.status = :status', {
        status: InnovationSupportStatusEnum.ENGAGING
      })
      .andWhere('innovationSupports.organisation_unit_id = :organisationUnit', {
        organisationUnit: organisationUnit
      })
      .getRawOne();

    const myAssignedInnovationsCount = await em
      .createQueryBuilder(InnovationSupportEntity, 'innovationSupports')
      .innerJoin('innovationSupports.organisationUnitUsers', 'unitUsers')
      .innerJoin('unitUsers.organisationUser', 'orgUsers')
      .innerJoin('orgUsers.user', 'user')
      .where('unitUsers.organisation_unit_id = :organisationUnit', {
        organisationUnit: organisationUnit
      })
      .andWhere('user.id = :userId', { userId: domainContext.id })
      .andWhere('innovationSupports.status = :status', {
        status: InnovationSupportStatusEnum.ENGAGING
      })
      .andWhere('user.status <> :userDeleted', { userDeleted: UserStatusEnum.DELETED }) // This is not needed since a deleted user would not be able to do this request
      .getCount();

    return {
      count: myAssignedInnovationsCount,
      total: myUnitInnovationsCount,
      lastSubmittedAt: lastSubmittedAt
    };
  }

  async actionsToReview(
    domainContext: DomainContextType,
    entityManager?: EntityManager
  ): Promise<{ count: number; total: number; lastSubmittedAt: null | Date }> {
    const organisationUnit = domainContext?.organisation?.organisationUnit?.id;

    const em = entityManager ?? this.sqlConnection.manager;

    const myActionsQuery = em
      .createQueryBuilder(InnovationActionEntity, 'actions')
      .select('actions.status', 'status')
      .addSelect('count(*)', 'count')
      .addSelect('MAX(actions.updated_at)', 'lastSubmittedAt')
      .innerJoin('actions.innovationSupport', 'innovationSupport')
      .innerJoin('innovationSupport.organisationUnit', 'orgUnit')
      .where('actions.created_by = :userId', { userId: domainContext.id })
      .andWhere('actions.status IN (:...status)', {
        status: [InnovationActionStatusEnum.SUBMITTED, InnovationActionStatusEnum.REQUESTED]
      });

    if (
      domainContext.currentRole.role === ServiceRoleEnum.ACCESSOR ||
      domainContext.currentRole.role === ServiceRoleEnum.QUALIFYING_ACCESSOR
    ) {
      if (!organisationUnit) {
        throw new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND);
      }
      myActionsQuery.andWhere('orgUnit.id = :orgUnitId', { orgUnitId: organisationUnit });
    }

    const myActionsCount = await myActionsQuery.groupBy('actions.status').getRawMany();

    const actions: Record<string, any> = {
      SUBMITTED: { count: 0, lastSubmittedAt: null },
      REQUESTED: { count: 0, lastSubmittedAt: null }
    };
    for (const action of myActionsCount) {
      actions[action.status] = { count: action.count, lastSubmittedAt: action.lastSubmittedAt };
    }

    return {
      count: actions['SUBMITTED'].count,
      total: actions['SUBMITTED'].count + actions['REQUESTED'].count,
      lastSubmittedAt:
        Object.values(actions)
          .map(_ => _.lastSubmittedAt)
          .sort((a, b) => b - a)[0] || null
    };
  }

  async innovationsToReview(
    domainContext: DomainContextType,
    entityManager?: EntityManager
  ): Promise<{ count: number; lastSubmittedAt: null | Date }> {
    const organisationUnit = domainContext?.organisation?.organisationUnit?.id;

    if (!organisationUnit) {
      throw new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND);
    }

    const em = entityManager ?? this.sqlConnection.manager;

    const { count, lastSubmittedAt } = await em
      .createQueryBuilder()
      .select('count(*)', 'count')
      .addSelect('MAX(lastSubmittedAt)', 'lastSubmittedAt')
      .from(
        qb =>
          qb
            .from(InnovationEntity, 'innovations')
            .select('innovations.id')
            .addSelect('MAX(innovations.submitted_at)', 'lastSubmittedAt')
            .innerJoin('innovations.organisationShares', 'organisationShares')
            .innerJoin('organisationShares.organisationUnits', 'organisationUnits')
            .leftJoin(
              'innovations.innovationSupports',
              'innovationSupports',
              'innovationSupports.innovation_id = innovations.id AND innovationSupports.organisation_unit_id = :organisationUnit',
              { organisationUnit }
            )
            .leftJoin('innovations.assessments', 'assessments')
            .leftJoin('assessments.organisationUnits', 'assessmentOrganisationUnits')
            .leftJoin('innovations.innovationSupportLogs', 'supportLogs', 'supportLogs.type = :supportLogType', {
              supportLogType: InnovationSupportLogTypeEnum.ACCESSOR_SUGGESTION
            })
            .leftJoin('supportLogs.suggestedOrganisationUnits', 'supportLogOrgUnit')
            .andWhere('(innovationSupports.id IS NULL OR innovationSupports.status = :supportStatus)', {
              supportStatus: InnovationSupportStatusEnum.UNASSIGNED
            })
            .andWhere('innovations.status = :status', { status: InnovationStatusEnum.IN_PROGRESS })
            .andWhere(
              `(assessmentOrganisationUnits.id = :suggestedOrganisationUnitId OR supportLogOrgUnit.id =:suggestedOrganisationUnitId)`,
              { suggestedOrganisationUnitId: organisationUnit }
            )
            .andWhere('organisationUnits.id = :organisationUnit', { organisationUnit })
            .groupBy('innovations.id'),
        'innovations'
      )
      .getRawOne();

    return {
      count: count,
      lastSubmittedAt: lastSubmittedAt
    };
  }
}
