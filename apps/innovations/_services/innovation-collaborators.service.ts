import { InnovationEntity, UserEntity } from '@innovations/shared/entities';
import { InnovationCollaboratorEntity } from '@innovations/shared/entities/innovation/innovation-collaborator.entity';
import { InnovationCollaboratorStatusEnum, NotifierTypeEnum } from '@innovations/shared/enums';
import { InnovationErrorsEnum, NotFoundError, UnauthorizedError, UnprocessableEntityError } from '@innovations/shared/errors';
import type { PaginationQueryParamsType } from '@innovations/shared/helpers';
import { DomainServiceSymbol, DomainServiceType, IdentityProviderService, IdentityProviderServiceSymbol, NotifierServiceSymbol, NotifierServiceType } from '@innovations/shared/services';
import type { DateISOType, DomainContextType } from '@innovations/shared/types';
import { inject, injectable } from 'inversify';
import { Brackets, EntityManager, ObjectLiteral } from 'typeorm';
import { BaseService } from './base.service';

@injectable()
export class InnovationCollaboratorsService extends BaseService {

  constructor(
    @inject(DomainServiceSymbol) private domainService: DomainServiceType,
    @inject(NotifierServiceSymbol) private notifierService: NotifierServiceType,
    @inject(IdentityProviderServiceSymbol) private identityProviderService: IdentityProviderService
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

  async getCollaboratorInfo(
    domainContext: DomainContextType,
    innovationId: string,
    collaboratorId: string,
    entityManager?: EntityManager
  ): Promise<{
    id: string,
    name?: string,
    collaboratorRole?: string,
    email: string,
    status: InnovationCollaboratorStatusEnum,
    innovation: { id: string, name: string, description: null | string, owner: { id: string, name?: string } },
    invitedAt: DateISOType,
  }> {

    const em = entityManager ?? this.sqlConnection.manager;

    const collaborator = await em.createQueryBuilder(InnovationCollaboratorEntity, 'collaborator')
      .innerJoin('collaborator.innovation', 'innovation')
      .leftJoin('collaborator.user', 'collaboratorUser')
      .innerJoin('innovation.owner', 'innovationOwner')
      .select([
        'innovation.name', 'innovation.description', 'innovation.id',
        'innovationOwner.identityId', 'innovationOwner.id',
        'collaboratorUser.identityId',
        'collaborator.id', 'collaborator.email', 'collaborator.status', 'collaborator.collaboratorRole', 'collaborator.invitedAt', 'collaborator.createdBy'
      ])
      .where('collaborator.innovation = :innovationId AND collaborator.id = :collaboratorId', { innovationId, collaboratorId })
      .getOne();
    if (!collaborator) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_COLLABORATOR_NOT_FOUND);
    }

    // Check if user is not the invited collaborator and the he is not the innovation owner
    if (collaborator.innovation.owner.id !== domainContext.id) {
      const domainUserInfo = await this.identityProviderService.getUserInfo(domainContext.identityId);
      if (collaborator.email !== domainUserInfo.email) {
        throw new UnauthorizedError(InnovationErrorsEnum.INNOVATION_COLLABORATOR_NO_ACCESS);
      }
    }

    const userIds = [collaborator.innovation.owner.identityId];
    if (collaborator.user) {
      userIds.push(collaborator.user.identityId);
    }
    const usersInfoMap = await this.identityProviderService.getUsersMap(userIds);

    const collaboratorName = collaborator.user && usersInfoMap.get(collaborator.user.identityId)?.displayName;
    const ownerName = usersInfoMap.get(collaborator.innovation.owner.identityId)?.displayName;

    return {
      id: collaborator.id,
      email: collaborator.email,
      status: collaborator.status,
      collaboratorRole: collaborator.collaboratorRole ?? undefined,
      name: collaboratorName ?? undefined,
      innovation: {
        id: collaborator.innovation.id,
        name: collaborator.innovation.name,
        description: collaborator.innovation.description,
        owner: {
          id: collaborator.innovation.owner.id,
          name: ownerName
        },
      },
      invitedAt: collaborator.invitedAt
    };
  }

  async updateCollaboratorInviteStatus(
    domainContext: DomainContextType,
    innovationId: string,
    data: { status: InnovationCollaboratorStatusEnum.ACTIVE | InnovationCollaboratorStatusEnum.DECLINED | InnovationCollaboratorStatusEnum.LEFT },
    entityManager?: EntityManager
  ): Promise<{ id: string }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const domainContextUserInfo = await this.identityProviderService.getUserInfo(domainContext.identityId);

    const invite = await connection.createQueryBuilder(InnovationCollaboratorEntity, 'collaborator')
      .where('collaborator.innovation = :innovationId && collaborator.email = :userEmail', { innovationId, userEmail: domainContextUserInfo.email })
      .getOne();

    if (!invite) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_COLLABORATOR_NOT_FOUND);
    }

    if (invite.status !== InnovationCollaboratorStatusEnum.PENDING && [InnovationCollaboratorStatusEnum.ACTIVE, InnovationCollaboratorStatusEnum.DECLINED].includes(data.status)) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_COLLABORATOR_WITH_UNPROCESSABLE_STATUS);
    }

    if (invite.status !== InnovationCollaboratorStatusEnum.ACTIVE && data.status === InnovationCollaboratorStatusEnum.LEFT) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_COLLABORATOR_WITH_UNPROCESSABLE_STATUS);
    }

    if (!invite.user) {
      invite.user = UserEntity.new({ id: domainContext.id });
    }
    invite.status = data.status;
    invite.updatedBy = domainContext.id;

    await connection.save(InnovationCollaboratorEntity, invite);

    return { id: invite.id };
  }

}
