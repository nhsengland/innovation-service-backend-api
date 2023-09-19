import { injectable } from 'inversify';

import { InnovationEntity, InnovationSupportEntity, InnovationTaskEntity } from '@users/shared/entities';
import {
  InnovationStatusEnum,
  InnovationSupportLogTypeEnum,
  InnovationSupportStatusEnum,
  InnovationTaskStatusEnum,
  UserStatusEnum
} from '@users/shared/enums';
import { OrganisationErrorsEnum, UnprocessableEntityError } from '@users/shared/errors';
import type { DomainContextType } from '@users/shared/types';

import type { EntityManager } from 'typeorm';
import { BaseService } from './base.service';

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
      .innerJoin('innovationSupports.userRoles', 'userRole')
      .innerJoin('userRole.user', 'user')
      .where('userRole.organisation_unit_id = :organisationUnit', {
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

  async tasksOpen(
    domainContext: DomainContextType,
    entityManager?: EntityManager
  ): Promise<{ count: number; total: number; lastSubmittedAt: null | Date }> {
    const organisationUnit = domainContext?.organisation?.organisationUnit?.id;

    const em = entityManager ?? this.sqlConnection.manager;

    const myActionsQuery = em
      .createQueryBuilder(InnovationTaskEntity, 'tasks')
      .select('orgUnit.id', 'orgUnitId')
      .addSelect('count(*)', 'count')
      .addSelect('MAX(tasks.updated_at)', 'lastSubmittedAt')
      .innerJoin('tasks.innovationSupport', 'innovationSupport')
      .innerJoin('innovationSupport.organisationUnit', 'orgUnit')
      .where('tasks.status = :status', {
        status: InnovationTaskStatusEnum.OPEN
      });

    const myTasksCount = await myActionsQuery.groupBy('orgUnit.id').getRawMany();

    const res = {
      count: 0,
      total: 0,
      lastSubmittedAt: null as Date | null
    };

    for (const action of myTasksCount) {
      if (action.orgUnitId === organisationUnit) {
        res.count += action.count;
        res.lastSubmittedAt = action.lastSubmittedAt;
      }
      res.total += action.count;
    }

    return res;
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
