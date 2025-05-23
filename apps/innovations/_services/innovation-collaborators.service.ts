import { InnovationEntity, UserEntity } from '@innovations/shared/entities';
import { InnovationCollaboratorEntity } from '@innovations/shared/entities/innovation/innovation-collaborator.entity';
import { InnovationCollaboratorStatusEnum, NotifierTypeEnum, ServiceRoleEnum } from '@innovations/shared/enums';
import {
  ConflictError,
  ForbiddenError,
  InnovationErrorsEnum,
  NotFoundError,
  UnprocessableEntityError
} from '@innovations/shared/errors';
import type { PaginationQueryParamsType } from '@innovations/shared/helpers';
import type { DomainService, IdentityProviderService, NotifierService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { DomainContextType } from '@innovations/shared/types';
import { inject, injectable } from 'inversify';
import { Brackets, EntityManager, ObjectLiteral } from 'typeorm';
import { BaseService } from './base.service';

type UpdateCollaboratorStatusType =
  | InnovationCollaboratorStatusEnum.ACTIVE
  | InnovationCollaboratorStatusEnum.CANCELLED
  | InnovationCollaboratorStatusEnum.DECLINED
  | InnovationCollaboratorStatusEnum.LEFT
  | InnovationCollaboratorStatusEnum.REMOVED;

@injectable()
export class InnovationCollaboratorsService extends BaseService {
  constructor(
    @inject(SHARED_SYMBOLS.DomainService) private domainService: DomainService,
    @inject(SHARED_SYMBOLS.NotifierService) private notifierService: NotifierService,
    @inject(SHARED_SYMBOLS.IdentityProviderService) private identityProviderService: IdentityProviderService
  ) {
    super();
  }

  async createCollaborator(
    domainContext: DomainContextType,
    innovationId: string,
    data: {
      email: string;
      role: string | null;
    },
    entityManager?: EntityManager
  ): Promise<{ id: string }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const dbCollaborator = await connection
      .createQueryBuilder(InnovationCollaboratorEntity, 'collaborator')
      .select(['collaborator.id', 'collaborator.status', 'collaborator.invitedAt'])
      .where('collaborator.email = :email AND collaborator.innovation_id = :innovationId', {
        email: data.email,
        innovationId
      })
      .getOne();

    if (
      dbCollaborator &&
      [InnovationCollaboratorStatusEnum.ACTIVE, InnovationCollaboratorStatusEnum.PENDING].includes(
        dbCollaborator.status
      )
    ) {
      throw new ConflictError(InnovationErrorsEnum.INNOVATION_COLLABORATOR_WITH_VALID_REQUEST);
    }

    const [user] = await this.domainService.users.getUserByEmail(data.email);

    if (user) {
      const isInnovator = user.roles.some(r => r.role === ServiceRoleEnum.INNOVATOR);
      // Check to see if he is attempting to create an invite for a QA/A or NA
      if (isInnovator === false) {
        throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_COLLABORATOR_MUST_BE_INNOVATOR);
      }

      // Check to see if he is attempting to create an invite for himself.
      if (domainContext.id === user?.id) {
        throw new ConflictError(InnovationErrorsEnum.INNOVATION_COLLABORATOR_CANT_BE_OWNER);
      }
    }

    const collaboratorObj = {
      collaboratorRole: data.role,
      status: InnovationCollaboratorStatusEnum.PENDING,
      updatedBy: domainContext.id,
      invitedAt: new Date().toISOString(),
      ...(user && { user: UserEntity.new({ id: user.id }) })
    };

    let collaboratorId;
    // Collaborator does not exist on DB.
    if (!dbCollaborator) {
      const collaborator = await connection.save(InnovationCollaboratorEntity, {
        ...collaboratorObj,
        email: data.email,
        innovation: InnovationEntity.new({ id: innovationId }),
        createdBy: domainContext.id
      });

      collaboratorId = collaborator.id;
    } else {
      // If it reaches here, a collaborator has already been created before.
      await connection.getRepository(InnovationCollaboratorEntity).update({ id: dbCollaborator.id }, collaboratorObj);

      collaboratorId = dbCollaborator.id;
    }

    await this.notifierService.send(domainContext, NotifierTypeEnum.COLLABORATOR_INVITE, {
      innovationId: innovationId,
      collaboratorId: collaboratorId
    });

    return { id: collaboratorId };
  }

  async getCollaboratorsList(
    innovationId: string,
    filters: {
      status?: InnovationCollaboratorStatusEnum[];
    },
    pagination: PaginationQueryParamsType<'createdAt' | 'updatedAt' | 'invitedAt' | 'status'>,
    entityManager?: EntityManager
  ): Promise<{
    count: number;
    data: {
      id: string;
      name?: string;
      isActive?: boolean;
      role?: string;
      email: string;
      status: InnovationCollaboratorStatusEnum;
    }[];
  }> {
    const em = entityManager ?? this.sqlConnection.manager;

    const query = em
      .createQueryBuilder(InnovationCollaboratorEntity, 'collaborators')
      .where('collaborators.innovation_id = :innovationId', { innovationId });

    // Filters
    if (filters.status && filters.status.length > 0) {
      const statusWithoutPendingAndExpired = filters.status.filter(
        s => ![InnovationCollaboratorStatusEnum.EXPIRED, InnovationCollaboratorStatusEnum.PENDING].includes(s)
      );
      const status = statusWithoutPendingAndExpired;

      if (
        filters.status.includes(InnovationCollaboratorStatusEnum.EXPIRED) &&
        filters.status.includes(InnovationCollaboratorStatusEnum.PENDING)
      ) {
        status.push(InnovationCollaboratorStatusEnum.PENDING);
      }

      const conditions: { condition: string; parameters: ObjectLiteral }[] = [];

      if (status.length > 0) {
        conditions.push({
          condition: 'collaborators.status IN (:...status)',
          parameters: { status: status }
        });
      }

      if (!status.includes(InnovationCollaboratorStatusEnum.PENDING)) {
        const parameters = {
          pendingStatus: InnovationCollaboratorStatusEnum.PENDING,
          expiredAtDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString()
        };

        // Since Expired is an afterLoad status we can not directly search for it in WHERE
        if (filters.status.includes(InnovationCollaboratorStatusEnum.EXPIRED)) {
          conditions.push({
            condition: 'collaborators.status = :pendingStatus AND collaborators.invitedAt < :expiredAtDate',
            parameters
          });
        }

        // Since Pending can be expired aswell we have to me more specific in WHERE clause
        if (filters.status.includes(InnovationCollaboratorStatusEnum.PENDING)) {
          conditions.push({
            condition: 'collaborators.status = :pendingStatus AND collaborators.invitedAt >= :expiredAtDate',
            parameters
          });
        }
      }

      if (conditions.length > 0) {
        query.andWhere(
          new Brackets(qb => {
            conditions.map(query => {
              qb.orWhere(query.condition, query.parameters);
            });
          })
        );
      }
    }

    // Pagination and ordering.
    query.skip(pagination.skip);
    query.take(pagination.take);

    for (const [key, order] of Object.entries(pagination.order)) {
      let field: string;
      switch (key) {
        case 'createdAt':
          field = 'collaborators.createdAt';
          break;
        case 'updatedAt':
          field = 'collaborators.updatedAt';
          break;
        case 'invitedAt':
          field = 'collaborators.invitedAt';
          break;
        case 'status':
          field = 'collaborators.status';
          break;
        default:
          field = 'collaborators.createdAt';
          break;
      }
      query.addOrderBy(field, order);
    }

    const [collaborators, count] = await query.getManyAndCount();

    if (count === 0) {
      return { count: 0, data: [] };
    }

    const userIds = collaborators.map(c => c.userId).filter((u): u is string => u !== null);

    const usersInfo = await this.domainService.users.getUsersMap({ userIds }, em);

    const data = collaborators.map(collaborator => ({
      id: collaborator.id,
      email: collaborator.email,
      status: collaborator.status,
      ...(collaborator.userId && {
        name: usersInfo.getDisplayName(collaborator.userId, ServiceRoleEnum.INNOVATOR),
        isActive: usersInfo.get(collaborator.userId)?.isActive ?? false
      }),
      ...(collaborator.collaboratorRole && { role: collaborator.collaboratorRole })
    }));

    return { count, data };
  }

  async getCollaboratorInfo(
    domainContext: DomainContextType,
    innovationId: string,
    collaboratorId: string,
    entityManager?: EntityManager
  ): Promise<{
    id: string;
    name?: string;
    role?: string;
    email: string;
    status: InnovationCollaboratorStatusEnum;
    innovation: {
      id: string;
      name: string;
      description?: string;
      owner?: { id: string; name?: string };
    };
    invitedAt: Date;
  }> {
    const em = entityManager ?? this.sqlConnection.manager;

    const collaborator = await em
      .createQueryBuilder(InnovationCollaboratorEntity, 'collaborator')
      .withDeleted()
      .innerJoin('collaborator.innovation', 'innovation')
      .innerJoin('innovation.documentDraft', 'documentDraft')
      .leftJoin('collaborator.user', 'collaboratorUser')
      .leftJoin('innovation.owner', 'innovationOwner')
      .select([
        'innovation.id',
        'innovation.name',
        'documentDraft.document',
        'innovationOwner.identityId',
        'innovationOwner.id',
        'innovationOwner.status',
        'innovationOwner.deletedAt',
        'collaboratorUser.identityId',
        'collaboratorUser.status',
        'collaborator.id',
        'collaborator.email',
        'collaborator.status',
        'collaborator.collaboratorRole',
        'collaborator.invitedAt',
        'collaborator.createdBy'
      ])
      .where('collaborator.innovation = :innovationId AND collaborator.id = :collaboratorId', {
        innovationId,
        collaboratorId
      })
      .getOne();

    if (!collaborator) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_COLLABORATOR_NOT_FOUND);
    }

    // Check if user is not the invited collaborator and the he is not the innovation owner
    if (collaborator.innovation.owner?.id !== domainContext.id) {
      const domainUserInfo = await this.domainService.users.getIdentityUserInfo({
        identityId: domainContext.identityId
      });
      if (collaborator.email.toLowerCase() !== domainUserInfo?.email.toLowerCase()) {
        throw new ForbiddenError(InnovationErrorsEnum.INNOVATION_COLLABORATOR_NO_ACCESS);
      }
    }

    return {
      id: collaborator.id,
      email: collaborator.email,
      status: collaborator.status,
      role: collaborator.collaboratorRole ?? undefined,
      name: collaborator.user
        ? await this.domainService.users.getDisplayName(
            { identityId: collaborator.user?.identityId },
            ServiceRoleEnum.INNOVATOR
          )
        : undefined, // if the collaborator doesn't have a user it's because it's an invited collaborator that hasn't created yet
      innovation: {
        id: collaborator.innovation.id,
        name: collaborator.innovation.name,
        description: collaborator.innovation.documentDraft.document.INNOVATION_DESCRIPTION.description,
        ...(collaborator.innovation.owner && {
          owner: {
            id: collaborator.innovation.owner.id,
            name: await this.domainService.users.getDisplayName(
              {
                identityId: collaborator.innovation.owner.identityId
              },
              ServiceRoleEnum.INNOVATOR
            )
          }
        })
      },
      invitedAt: collaborator.invitedAt
    };
  }

  async updateCollaborator(
    domainContext: DomainContextType,
    collaboratorId: string,
    innovationId: string,
    isOwner: boolean, // Is either owner or collaborator at this point
    data: { status?: UpdateCollaboratorStatusType; role?: string },
    entityManager?: EntityManager
  ): Promise<{ id: string }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const collaborator = await connection
      .createQueryBuilder(InnovationCollaboratorEntity, 'collaborator')
      .select(['collaborator.email', 'collaborator.id', 'collaborator.status', 'collaborator.invitedAt'])
      .where('collaborator.id = :collaboratorId', { collaboratorId })
      .getOne();

    if (!collaborator) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_COLLABORATOR_NOT_FOUND);
    }

    if (!isOwner && data.role) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_COLLABORATOR_MUST_BE_OWNER);
    }

    if (data.status) {
      await this.runUpdateStatusRules({ status: collaborator.status }, isOwner, data.status);
    }

    await connection.getRepository(InnovationCollaboratorEntity).update(
      { id: collaborator.id },
      {
        updatedBy: domainContext.id,
        ...(data.status && { status: data.status }),
        ...(data.role && { collaboratorRole: data.role }),
        ...(!collaborator.user && !isOwner && { user: UserEntity.new({ id: domainContext.id }) })
      }
    );

    if (data.status) {
      await this.notifierService.send(domainContext, NotifierTypeEnum.COLLABORATOR_UPDATE, {
        innovationId: innovationId,
        collaborator: { id: collaborator.id, status: data.status }
      });
    }

    return { id: collaborator.id };
  }

  async getCollaborationInfo(
    requestUser: { id: string; email: string },
    collaboratorId: string,
    entityManager?: EntityManager
  ): Promise<{ type: 'OWNER' | 'COLLABORATOR'; status?: InnovationCollaboratorStatusEnum }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const collaborator = await connection
      .createQueryBuilder(InnovationCollaboratorEntity, 'collaborator')
      .innerJoin('collaborator.innovation', 'innovation')
      .leftJoin('innovation.owner', 'innovationOwner')
      .select([
        'innovation.id',
        'innovationOwner.id',
        'collaborator.email',
        'collaborator.status',
        'collaborator.invitedAt'
      ])
      .where('collaborator.id = :collaboratorId', { collaboratorId })
      .getOne();

    if (!collaborator) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_COLLABORATOR_NOT_FOUND);
    }

    const isOwner = collaborator.innovation.owner?.id === requestUser.id;
    const isCollaborator = collaborator.email.toLowerCase() === requestUser.email.toLowerCase();

    if (!isOwner && !isCollaborator) {
      throw new ForbiddenError(InnovationErrorsEnum.INNOVATION_COLLABORATOR_NO_ACCESS);
    }

    return {
      type: isOwner ? 'OWNER' : 'COLLABORATOR',
      status: collaborator.status
    };
  }

  async upsertCollaborator(
    domainContext: DomainContextType,
    data: {
      innovationId: string;
      email: string;
      userId: string;
      status: InnovationCollaboratorStatusEnum;
    },
    entityManager?: EntityManager
  ): Promise<{ id: string }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const collaborator = await connection
      .createQueryBuilder(InnovationCollaboratorEntity, 'collaborator')
      .withDeleted()
      .select(['collaborator.id'])
      .where('collaborator.email = :email AND collaborator.innovation_id = :innovationId', {
        email: data.email,
        innovationId: data.innovationId
      })
      .getOne();

    if (collaborator) {
      await connection.getRepository(InnovationCollaboratorEntity).restore({ id: collaborator.id });

      await connection.getRepository(InnovationCollaboratorEntity).update(
        { id: collaborator.id },
        {
          status: data.status,
          updatedBy: domainContext.id
        }
      );

      return { id: collaborator.id };
    } else {
      const newCollaborator = await connection.save(InnovationCollaboratorEntity, {
        status: data.status,
        updatedBy: domainContext.id,
        email: data.email,
        createdBy: domainContext.id,
        invitedAt: new Date().toISOString(),
        innovation: InnovationEntity.new({ id: data.innovationId }),
        user: UserEntity.new({ id: data.userId })
      });

      return { id: newCollaborator.id };
    }
  }

  async deleteCollaborator(
    innovationId: string,
    email: string,
    entityManager?: EntityManager
  ): Promise<{ id: string }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const collaborator = await connection
      .createQueryBuilder(InnovationCollaboratorEntity, 'collaborators')
      .where('collaborators.email = :email AND collaborators.innovation_id = :innovationId', {
        email,
        innovationId
      })
      .getOne();

    if (!collaborator) {
      return { id: '' };
    }

    await connection.softDelete(InnovationCollaboratorEntity, { id: collaborator.id });
    return { id: collaborator.id };
  }

  /**
   * Checks if a given collaborator is in Pending status
   * and if the invited user exists on the service
   * @param id
   * @param entityManager
   * @returns
   */
  async checkCollaborator(
    id: string,
    entityManager?: EntityManager
  ): Promise<{ userExists: boolean; collaboratorStatus: InnovationCollaboratorStatusEnum }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const collaborator = await connection
      .createQueryBuilder(InnovationCollaboratorEntity, 'collaborators')
      .select(['collaborators.id', 'collaborators.status', 'collaborators.email', 'collaborators.invitedAt'])
      .where('collaborators.id = :id', { id })
      .getOne();

    if (!collaborator) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_COLLABORATOR_NOT_FOUND);
    }

    const authUser = await this.identityProviderService.getUserInfoByEmail(collaborator.email);

    return { userExists: !!authUser, collaboratorStatus: collaborator.status };
  }

  private async runUpdateStatusRules(
    collaborator: { status: InnovationCollaboratorStatusEnum },
    isOwner: boolean,
    statusToUpdate: UpdateCollaboratorStatusType
  ): Promise<void> {
    if (isOwner) {
      // If owner wants to update the status to cancel the collaborator needs to be in PENDING status
      if (
        collaborator.status !== InnovationCollaboratorStatusEnum.PENDING &&
        statusToUpdate === InnovationCollaboratorStatusEnum.CANCELLED
      ) {
        throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_COLLABORATOR_WITH_UNPROCESSABLE_STATUS);
      }
      // If owner wants to update the status to removed the collaborator needs to be in ACTIVE status
      if (
        collaborator.status !== InnovationCollaboratorStatusEnum.ACTIVE &&
        statusToUpdate === InnovationCollaboratorStatusEnum.REMOVED
      ) {
        throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_COLLABORATOR_WITH_UNPROCESSABLE_STATUS);
      }
    } else {
      // INVITED Collaborator
      // If collaborator wants to update the status to ACTIVE/DECLINE the collaborator needs to be in PENDING status
      if (
        collaborator.status !== InnovationCollaboratorStatusEnum.PENDING &&
        [InnovationCollaboratorStatusEnum.ACTIVE, InnovationCollaboratorStatusEnum.DECLINED].includes(statusToUpdate)
      ) {
        throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_COLLABORATOR_WITH_UNPROCESSABLE_STATUS);
      }
      // If collaborator wants to update the status to LEFT the collaborator needs to be in ACTIVE status
      if (
        collaborator.status !== InnovationCollaboratorStatusEnum.ACTIVE &&
        statusToUpdate === InnovationCollaboratorStatusEnum.LEFT
      ) {
        throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_COLLABORATOR_WITH_UNPROCESSABLE_STATUS);
      }
      return;
    }
  }
}
