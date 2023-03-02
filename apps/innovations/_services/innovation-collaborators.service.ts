import { InnovationEntity, UserEntity } from "@innovations/shared/entities";
import { InnovationCollaboratorEntity } from "@innovations/shared/entities/innovation/innovation-collaborator.entity";
import { InnovationCollaboratorStatusEnum, NotifierTypeEnum } from "@innovations/shared/enums";
import { InnovationErrorsEnum, UnprocessableEntityError } from "@innovations/shared/errors";
import type { PaginationQueryParamsType } from "@innovations/shared/helpers";
import { DomainServiceSymbol, DomainServiceType, NotifierServiceSymbol, NotifierServiceType } from "@innovations/shared/services";
import type { DomainContextType } from "@innovations/shared/types";
import { inject, injectable } from "inversify";
import { Brackets, EntityManager, ObjectLiteral } from "typeorm";
import { BaseService } from "./base.service";

@injectable()
export class InnovationCollaboratorsService extends BaseService {

  constructor(
    @inject(DomainServiceSymbol) private domainService: DomainServiceType,
    @inject(NotifierServiceSymbol) private notifierService: NotifierServiceType
  ) { super(); }

  async createCollaborator(
    domainContext: DomainContextType,
    innovationId: string,
    data: { email: string, role: string | null },
    entityManager?: EntityManager,
  ): Promise<{ id: string }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const invite = await connection.createQueryBuilder(InnovationCollaboratorEntity, 'collaborators')
      .where('collaborators.email = :email', { email: data.email })
      .andWhere('collaborators.innovation_id = :innovationId', { innovationId })
      .getCount();

    if (invite) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_COLLABORATOR_ALREADY_CREATED_REQUEST);
    }

    const [user] = await this.domainService.users.getUserByEmail(data.email);

    const collaboratorObj = InnovationCollaboratorEntity.new({
      email: data.email,
      collaboratorRole: data.role,
      status: InnovationCollaboratorStatusEnum.PENDING,
      innovation: InnovationEntity.new({ id: innovationId }),
      createdBy: domainContext.id,
      updatedBy: domainContext.id,
      invitedAt: new Date().toISOString(),
      ...(user && { user: UserEntity.new({ id: user.id }) })
    });

    const collaborator = await connection.save(InnovationCollaboratorEntity, collaboratorObj);

    await this.notifierService.send(
      { id: domainContext.id, identityId: domainContext.identityId },
      NotifierTypeEnum.INNOVATION_COLLABORATOR_INVITE,
      {
        innovationCollaboratorId: collaborator.id,
        innovationId: innovationId
      },
      domainContext,
    );

    return { id: collaborator.id };
  }

  async getCollaboratorsList(
    innovationId: string,
    filters: {
      status?: InnovationCollaboratorStatusEnum[]
    },
    pagination: PaginationQueryParamsType<'createdAt' | 'updatedAt' | 'invitedAt' | 'status'>,
    entityManager?: EntityManager
  ): Promise<{
    count: number,
    data: {
      id: string;
      name?: string;
      collaboratorRole?: string;
      email: string;
      status: InnovationCollaboratorStatusEnum
    }[]
  }> {
    const em = entityManager ?? this.sqlConnection.manager;

    const query = em.createQueryBuilder(InnovationCollaboratorEntity, 'collaborators')
      .where('collaborators.innovation_id = :innovationId', { innovationId });

    // Filters
    if (filters.status && filters.status.length > 0) {
      const statusWithoutPendingAndExpired = filters.status.filter(s => ![InnovationCollaboratorStatusEnum.EXPIRED, InnovationCollaboratorStatusEnum.PENDING].includes(s));
      const status = statusWithoutPendingAndExpired;

      if (filters.status.includes(InnovationCollaboratorStatusEnum.EXPIRED) && filters.status.includes(InnovationCollaboratorStatusEnum.PENDING)) {
        status.push(InnovationCollaboratorStatusEnum.PENDING);
      }

      const conditions: { condition: string, parameters: ObjectLiteral }[] = [];

      if (status.length > 0) {
        conditions.push({ condition: 'collaborators.status IN (:...status)', parameters: { status: status } });
      }

      if (!status.includes(InnovationCollaboratorStatusEnum.PENDING)) {

        const parameters = {
          pendingStatus: InnovationCollaboratorStatusEnum.PENDING,
          expiredAtDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString()
        }

        // Since Expired is an afterLoad status we can not directly search for it in WHERE
        if (filters.status.includes(InnovationCollaboratorStatusEnum.EXPIRED)) {
          conditions.push({ condition: 'collaborators.status = :pendingStatus AND collaborators.invitedAt < :expiredAtDate', parameters });
        }

        // Since Pending can be expired aswell we have to me more specific in WHERE clause
        if (filters.status.includes(InnovationCollaboratorStatusEnum.PENDING)) {
          conditions.push({ condition: 'collaborators.status = :pendingStatus AND collaborators.invitedAt >= :expiredAtDate', parameters });
        }

      }

      if (conditions.length > 0) {
        query.andWhere(
          new Brackets(qb => {
            conditions.map(query => {
              qb.orWhere(query.condition, query.parameters);
            });
          }),
        );
      }

    }

    // Pagination and ordering.
    query.skip(pagination.skip);
    query.take(pagination.take);

    for (const [key, order] of Object.entries(pagination.order)) {
      let field: string;
      switch (key) {
        case 'createdAt': field = 'collaborators.createdAt'; break;
        case 'updatedAt': field = 'collaborators.updatedAt'; break;
        case 'invitedAt': field = 'collaborators.invitedAt'; break;
        case 'status': field = 'collaborators.status'; break;
        default:
          field = 'collaborators.createdAt'; break;
      }
      query.addOrderBy(field, order);
    }

    const [collaborators, count] = await query.getManyAndCount();

    if (count === 0) {
      return { count: 0, data: [] };
    }

    const usersInfo = await this.domainService.users.getUsersList({ userIds: collaborators.map(c => c.userId) });
    const usersInfoMap = new Map(usersInfo.map(u => [u.id, u]));

    const data = collaborators.map((collaborator) => ({
      id: collaborator.id,
      email: collaborator.email,
      status: collaborator.status,
      ...(usersInfoMap.has(collaborator.userId) && { name: usersInfoMap.get(collaborator.userId)?.displayName ?? '' }),
      ...(collaborator.collaboratorRole && { collaboratorRole: collaborator.collaboratorRole })
    }));

    return {
      count,
      data
    };
  }

}
