import { inject, injectable } from 'inversify';

import { InnovationEntity, InnovationSupportEntity, SupportLastActivityUpdateView } from '@users/shared/entities';
import {
  InnovationStatusEnum,
  InnovationSupportStatusEnum,
  InnovationTaskStatusEnum,
  UserStatusEnum
} from '@users/shared/enums';
import { OrganisationErrorsEnum, UnprocessableEntityError } from '@users/shared/errors';
import type { DomainContextType } from '@users/shared/types';

import type { DomainService } from '@users/shared/services';
import SHARED_SYMBOLS from '@users/shared/services/symbols';
import type { EntityManager } from 'typeorm';
import { BaseService } from './base.service';

@injectable()
export class StatisticsService extends BaseService {
  constructor(@inject(SHARED_SYMBOLS.DomainService) private domainService: DomainService) {
    super();
  }

  async waitingAssessment(entityManager?: EntityManager): Promise<{ count: number; overdue: number }> {
    const em = entityManager ?? this.sqlConnection.manager;

    const query = await em
      .createQueryBuilder(InnovationEntity, 'innovation')
      .leftJoin('innovation.currentAssessment', 'currentAssessment')
      .where('innovation.status IN (:...assessmentInnovationStatus)', {
        assessmentInnovationStatus: [InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT]
      })
      .getCount();

    const overdueCount = await em
      .createQueryBuilder(InnovationEntity, 'innovation')
      .leftJoin('innovation.currentAssessment', 'currentAssessment')
      .where('innovation.status IN (:...assessmentInnovationStatus)', {
        assessmentInnovationStatus: [InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT]
      })
      .andWhere(`DATEDIFF(day, innovation.submitted_at, GETDATE()) > 7 AND currentAssessment.finished_at IS NULL`)
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
      .leftJoin('innovation.currentAssessment', 'currentAssessment')
      .leftJoin('currentAssessment.assignTo', 'assignTo')
      .where('innovation.status IN (:...assessmentInnovationStatus)', {
        assessmentInnovationStatus: [InnovationStatusEnum.NEEDS_ASSESSMENT]
      })
      .andWhere('assignTo.id = :userId', { userId })
      .getCount();

    const total = await em
      .createQueryBuilder(InnovationEntity, 'innovation')
      .leftJoin('innovation.currentAssessment', 'currentAssessment')
      .leftJoin('currentAssessment.assignTo', 'assignTo')
      .where('innovation.status IN (:...assessmentInnovationStatus)', {
        assessmentInnovationStatus: [InnovationStatusEnum.NEEDS_ASSESSMENT]
      })
      .getCount();

    const overdueCount = await em
      .createQueryBuilder(InnovationEntity, 'innovation')
      .leftJoin('innovation.currentAssessment', 'currentAssessment')
      .leftJoin('currentAssessment.assignTo', 'assignTo')
      .where('innovation.status IN (:...assessmentInnovationStatus)', {
        assessmentInnovationStatus: [InnovationStatusEnum.NEEDS_ASSESSMENT]
      })
      .andWhere(`DATEDIFF(day, innovation.submitted_at, GETDATE()) > 7 AND currentAssessment.finished_at IS NULL`)
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

  // using type inference
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async getTasksCounter<T extends InnovationTaskStatusEnum[]>(domainContext: DomainContextType, statuses: T) {
    return this.domainService.innovations.getTasksCounter(domainContext, statuses, { mine: true });
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
      .createQueryBuilder(InnovationEntity, 'innovations')
      .select('count(*)', 'count')
      .addSelect('MAX(innovations.submitted_at)', 'lastSubmittedAt')
      .innerJoin('innovations.innovationSupports', 'supports')
      .where('innovations.status = :status', { status: InnovationStatusEnum.IN_PROGRESS })
      .andWhere('supports.status = :supportStatus', { supportStatus: InnovationSupportStatusEnum.SUGGESTED })
      .andWhere('supports.organisation_unit_id = :organisationUnit', { organisationUnit })
      .getRawOne();

    return {
      count: count,
      lastSubmittedAt: lastSubmittedAt
    };
  }

  async getInnovationsNotUpdatedForMoreThan30Days(
    organisationUnitId: string,
    entityManager?: EntityManager
  ): Promise<{ id: string }[]> {
    const em = entityManager ?? this.sqlConnection.manager;

    const innovations = await em
      .createQueryBuilder(SupportLastActivityUpdateView, 'lastActivity')
      .select(['lastActivity.innovationId'])
      .where('last_update <= DATEADD(day, -30, GETDATE())')
      .andWhere('organisation_unit_id = :organisationUnitId', { organisationUnitId })
      .getMany();

    return innovations.map(i => ({ id: i.innovationId }));
  }

  async getInnovationsSuggestedForMoreThan3WorkDays(
    organisationUnitId: string,
    entityManager?: EntityManager
  ): Promise<{ id: string }[]> {
    const em = entityManager ?? this.sqlConnection.manager;

    const innovations = await em
      .createQueryBuilder(InnovationSupportEntity, 'innovation_support')
      .select('innovation_support.innovation_id')
      .addSelect('dbo.workdaysBetween(innovation_support.updated_at, GETDATE())', 'workdays_since_update')
      .where('dbo.workdaysBetween(innovation_support.updated_at, GETDATE()) > 3')
      .andWhere('innovation_support.is_most_recent = 1')
      .andWhere('innovation_support.status = :status', { status: 'SUGGESTED' })
      .andWhere('innovation_support.organisation_unit_id = :organisationUnitId', { organisationUnitId })
      .getRawMany();

    return innovations.map(i => ({ id: i['innovation_id'] }));
  }
}
