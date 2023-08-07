import { inject, injectable } from 'inversify';
import type { EntityManager } from 'typeorm';

import { BaseService } from './base.service';

import { InnovationExportRequestEntity } from '@innovations/shared/entities';
import { InnovationExportRequestStatusEnum, ServiceRoleEnum } from '@innovations/shared/enums';
import {
  BadRequestError,
  InnovationErrorsEnum,
  NotFoundError,
  UnprocessableEntityError
} from '@innovations/shared/errors';
import type { PaginationQueryParamsType } from '@innovations/shared/helpers';
import type { DomainService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { DomainContextType } from '@innovations/shared/types';

@injectable()
export class InnovationExportRequestService extends BaseService {
  constructor(@inject(SHARED_SYMBOLS.DomainService) private domainService: DomainService) {
    super();
  }

  async createExportRequest(
    domainContext: DomainContextType,
    innovationId: string,
    data: { requestReason: string },
    entityManager?: EntityManager
  ): Promise<void> {
    const em = entityManager ?? this.sqlConnection.manager;

    await em.save(
      InnovationExportRequestEntity,
      InnovationExportRequestEntity.verifyType({
        innovation: { id: innovationId },
        createdByUserRole: { id: domainContext.currentRole.id },
        status: InnovationExportRequestStatusEnum.PENDING,
        requestReason: data.requestReason,
        createdBy: domainContext.id,
        updatedBy: domainContext.id
      })
    );
  }

  async getExportRequestInfo(
    domainContext: DomainContextType,
    exportRequestId: string,
    entityManager?: EntityManager
  ): Promise<{
    id: string;
    status: InnovationExportRequestStatusEnum;
    requestReason: string;
    rejectReason?: string;
    createdBy: {
      name: string;
      displayRole?: string;
      displayTeam?: string;
    };
    createdAt: Date;
    updatedBy: {
      name: string;
    };
    updatedAt: Date;
  }> {
    const em = entityManager ?? this.sqlConnection.manager;

    const query = em
      .createQueryBuilder(InnovationExportRequestEntity, 'request')
      .select([
        'request.id',
        'request.status',
        'request.requestReason',
        'request.rejectReason',
        'request.createdAt',
        'request.createdBy',
        'request.updatedAt',
        'request.updatedBy',
        'userRole.id',
        'userRole.role',
        'unit.id',
        'unit.name'
      ])
      .innerJoin('request.createdByUserRole', 'userRole')
      .leftJoin('userRole.organisationUnit', 'unit')
      .where('request.id = :exportRequestId', { exportRequestId });

    if (domainContext.currentRole.role === ServiceRoleEnum.ASSESSMENT) {
      query.andWhere('userRole.role = :assessmentRole', { assessmentRole: ServiceRoleEnum.ASSESSMENT });
    } else if (
      domainContext.currentRole.role === ServiceRoleEnum.ACCESSOR ||
      domainContext.currentRole.role === ServiceRoleEnum.QUALIFYING_ACCESSOR
    ) {
      query.andWhere('userRole.organisation_unit_id = :unitId', {
        unitId: domainContext.organisation?.organisationUnit?.id
      });
    }

    const request = await query.getOne();
    if (!request) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_EXPORT_REQUEST_NOT_FOUND);
    }

    const usersInfo = await this.domainService.users.getUsersMap({ userIds: [request.createdBy, request.updatedBy] });

    return {
      id: request.id,
      status: request.status,
      requestReason: request.requestReason,
      rejectReason: request.rejectReason ?? undefined,
      createdAt: request.createdAt,
      createdBy: {
        name: usersInfo.get(request.createdBy)?.displayName ?? '[deleted user]',
        displayRole: this.domainService.users.getDisplayRoleInformation(
          request.createdBy,
          request.createdByUserRole.role
        ),
        displayTeam: this.domainService.users.getDisplayTeamInformation(
          request.createdByUserRole.role,
          request.createdByUserRole.organisationUnit?.name
        )
      },
      updatedAt: request.updatedAt,
      updatedBy: {
        name: usersInfo.get(request.createdBy)?.displayName ?? '[deleted user]'
      }
    };
  }

  async getExportRequestList(
    domainContext: DomainContextType,
    innovationId: string,
    filters: {
      statuses?: InnovationExportRequestStatusEnum[];
    },
    pagination: PaginationQueryParamsType<'createdAt'>,
    entityManager?: EntityManager
  ): Promise<{
    count: number;
    data: {
      id: string;
      status: InnovationExportRequestStatusEnum;
      createdBy: {
        name: string;
        displayRole?: string;
        displayTeam?: string;
      };
      createdAt: Date;
    }[];
  }> {
    const em = entityManager ?? this.sqlConnection.manager;

    const query = em
      .createQueryBuilder(InnovationExportRequestEntity, 'request')
      .select([
        'request.id',
        'request.status',
        'request.createdAt',
        'request.createdBy',
        'userRole.id',
        'userRole.role',
        'unit.id',
        'unit.name'
      ])
      .innerJoin('request.createdByUserRole', 'userRole')
      .leftJoin('userRole.organisationUnit', 'unit')
      .where('request.innovation_id = :innovationId', { innovationId });

    if (domainContext.currentRole.role === ServiceRoleEnum.ASSESSMENT) {
      query.andWhere('userRole.role = :assessmentRole', { assessmentRole: ServiceRoleEnum.ASSESSMENT });
    } else if (
      domainContext.currentRole.role === ServiceRoleEnum.ACCESSOR ||
      domainContext.currentRole.role === ServiceRoleEnum.QUALIFYING_ACCESSOR
    ) {
      query.andWhere('userRole.organisation_unit_id = :unitId', {
        unitId: domainContext.organisation?.organisationUnit?.id
      });
    }

    if (filters.statuses && filters.statuses.length > 0) {
      query.andWhere('request.status IN (:...requestStatuses)', { requestStatuses: filters.statuses });
    }

    // Pagination and ordering.
    query.skip(pagination.skip);
    query.take(pagination.take);

    for (const [key, order] of Object.entries(pagination.order)) {
      let field: string;
      switch (key) {
        default:
          field = 'request.createdAt';
          break;
      }
      query.addOrderBy(field, order);
    }

    const [requests, count] = await query.getManyAndCount();

    if (count === 0) {
      return { count: 0, data: [] };
    }

    const usersInfo = await this.domainService.users.getUsersMap({ userIds: requests.map(r => r.createdBy) });

    return {
      count,
      data: requests.map(r => ({
        id: r.id,
        status: r.status,
        createdAt: r.createdAt,
        createdBy: {
          name: usersInfo.get(r.createdBy)?.displayName ?? '[deleted user]',
          displayRole: this.domainService.users.getDisplayRoleInformation(r.createdBy, r.createdByUserRole.role),
          displayTeam: this.domainService.users.getDisplayTeamInformation(
            r.createdByUserRole.role,
            r.createdByUserRole.organisationUnit?.name
          )
        }
      }))
    };
  }

  async updateExportRequest(
    domainContext: DomainContextType,
    exportRequestId: string,
    data: { status: InnovationExportRequestStatusEnum; rejectReason?: string },
    entityManager?: EntityManager
  ): Promise<void> {
    const em = entityManager ?? this.sqlConnection.manager;

    const request = await em
      .createQueryBuilder(InnovationExportRequestEntity, 'request')
      .where('request.id = :exportRequestId', { exportRequestId })
      .getOne();
    if (!request) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_EXPORT_REQUEST_NOT_FOUND);
    }

    if (request.status !== InnovationExportRequestStatusEnum.PENDING) {
      throw new UnprocessableEntityError(
        InnovationErrorsEnum.INNOVATION_RECORD_EXPORT_REQUEST_WITH_UNPROCESSABLE_STATUS
      );
    }

    if (data.status === InnovationExportRequestStatusEnum.REJECTED && !data.rejectReason) {
      throw new BadRequestError(InnovationErrorsEnum.INNOVATION_RECORD_EXPORT_REQUEST_REJECT_REASON_REQUIRED);
    }

    // TODO: Verify if it can do the update using domainContext
    console.log(domainContext);

    await em.update(
      InnovationExportRequestEntity,
      { id: exportRequestId },
      { status: data.status, rejectReason: data.rejectReason ?? null }
    );
  }
}
