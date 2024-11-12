import { inject, injectable } from 'inversify';
import type { EntityManager, SelectQueryBuilder } from 'typeorm';

import { InnovationEntity, InnovationTransferEntity, UserEntity } from '@innovations/shared/entities';
import {
  ActivityEnum,
  InnovationArchiveReasonEnum,
  InnovationCollaboratorStatusEnum,
  InnovationTransferStatusEnum,
  NotifierTypeEnum,
  ServiceRoleEnum
} from '@innovations/shared/enums';
import {
  BadRequestError,
  GenericErrorsEnum,
  InnovationErrorsEnum,
  UnprocessableEntityError
} from '@innovations/shared/errors';
import type { DomainService, IdentityProviderService, NotifierService } from '@innovations/shared/services';

import { NotFoundError } from '@innovations/shared/errors';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { DomainContextType } from '@innovations/shared/types';
import { BaseService } from './base.service';
import type { InnovationCollaboratorsService } from './innovation-collaborators.service';
import SYMBOLS from './symbols';

type TransferQueryFilterType = {
  id?: string;
  innovationId?: string;
  status?: InnovationTransferStatusEnum;
  email?: string;
  createdBy?: string;
};

@injectable()
export class InnovationTransferService extends BaseService {
  constructor(
    @inject(SHARED_SYMBOLS.IdentityProviderService)
    private identityProviderService: IdentityProviderService,
    @inject(SHARED_SYMBOLS.DomainService) private domainService: DomainService,
    @inject(SHARED_SYMBOLS.NotifierService) private notifierService: NotifierService,
    @inject(SYMBOLS.InnovationCollaboratorsService)
    private collaboratorsService: InnovationCollaboratorsService
  ) {
    super();
  }

  private buildTransferQuery(
    filter: TransferQueryFilterType,
    entityManager?: EntityManager
  ): SelectQueryBuilder<InnovationTransferEntity> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const query = connection
      .createQueryBuilder(InnovationTransferEntity, 'innovationTransfer')
      .innerJoinAndSelect('innovationTransfer.innovation', 'innovation')
      .where('DATEDIFF(day, innovationTransfer.created_at, GETDATE()) < 31');

    if (filter.id) {
      query.andWhere('innovationTransfer.id = :id', { id: filter.id });
    }
    if (filter.innovationId) {
      query.andWhere('innovationTransfer.innovation_id = :innovationId', {
        innovationId: filter.innovationId
      });
    }
    if (filter.status) {
      query.andWhere('innovationTransfer.status = :status', { status: filter.status });
    }
    if (filter.email) {
      query.andWhere('innovationTransfer.email = :email', { email: filter.email });
    }
    if (filter.createdBy) {
      query.andWhere('innovationTransfer.created_by = :createdBy', { createdBy: filter.createdBy });
    }

    return query;
  }

  async getInnovationTransfersList(
    requestUserId: string,
    assignedToMe?: boolean,
    entityManager?: EntityManager
  ): Promise<
    {
      id: string;
      email: string;
      innovation: { id: string; name: string; owner?: string };
    }[]
  > {
    const filter: TransferQueryFilterType = { status: InnovationTransferStatusEnum.PENDING };

    if (assignedToMe) {
      filter.email = (await this.domainService.users.getUserInfo({ userId: requestUserId })).email;
    } else {
      filter.createdBy = requestUserId;
    }

    const transfers = await this.buildTransferQuery(filter, entityManager).getMany();

    return Promise.all(
      transfers.map(async transfer => {
        try {
          const createdBy = await this.domainService.users.getUserInfo({
            userId: transfer.createdBy
          });

          return {
            id: transfer.id,
            email: transfer.email,
            innovation: {
              id: transfer.innovation.id,
              name: transfer.innovation.name,
              owner: createdBy.displayName
            }
          };
        } catch {
          return {
            id: transfer.id,
            email: transfer.email,
            innovation: {
              id: transfer.innovation.id,
              name: transfer.innovation.name
            }
          };
        }
      })
    );
  }

  async getPendingInnovationTransferInfo(id: string, entityManager?: EntityManager): Promise<{ userExists: boolean }> {
    const dbTranfer = await this.buildTransferQuery(
      {
        id,
        status: InnovationTransferStatusEnum.PENDING
      },
      entityManager
    ).getOne();
    if (!dbTranfer) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_TRANSFER_NOT_FOUND);
    }

    try {
      const authUser = await this.identityProviderService.getUserInfoByEmail(dbTranfer.email);

      return { userExists: !!authUser?.identityId };
    } catch {
      return { userExists: false };
    }
  }

  async getInnovationTransferInfo(
    id: string,
    entityManager?: EntityManager
  ): Promise<{
    id: string;
    email: string;
    innovation: { id: string; name: string; owner: { name: string } };
  }> {
    const transfer = await this.buildTransferQuery(
      { id, status: InnovationTransferStatusEnum.PENDING },
      entityManager
    ).getOne();
    if (!transfer) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_TRANSFER_NOT_FOUND);
    }

    const transferOwner = await this.domainService.users.getUserInfo({
      userId: transfer.createdBy
    });

    return {
      id: transfer.id,
      email: transfer.email,
      innovation: {
        id: transfer.innovation.id,
        name: transfer.innovation.name,
        owner: { name: transferOwner.displayName }
      }
    };
  }

  async createInnovationTransfer(
    requestUser: { id: string; identityId: string },
    domainContext: DomainContextType,
    innovationId: string,
    targetUserEmail: string,
    ownerToCollaborator: boolean,
    entityManager?: EntityManager
  ): Promise<{ id: string }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    // Get innovation information.
    const innovation = await this.sqlConnection
      .createQueryBuilder(InnovationEntity, 'innovation')
      .select(['innovation.id'])
      .where('innovation.id = :innovationId', { innovationId })
      .getOne();
    if (!innovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    // Check if a transfer request if already raised.
    const transfer = await this.buildTransferQuery(
      {
        innovationId,
        status: InnovationTransferStatusEnum.PENDING
      },
      connection
    ).getOne();
    if (transfer) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_TRANSFER_ALREADY_EXISTS);
    }

    // Request user cannot transfer the innovation to himself.
    const targetUser = await this.identityProviderService.getUserInfoByEmail(targetUserEmail);
    if (targetUser && targetUser.identityId === requestUser.identityId) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_TRANSFER_REQUESTED_FOR_SELF);
    }

    if (targetUser) {
      // Check if target user is an Innovator
      const isTargetUserInnovator = await connection
        .createQueryBuilder(UserEntity, 'user')
        .innerJoin('user.serviceRoles', 'userRoles')
        .where('user.identityId = :identityId', { identityId: targetUser?.identityId })
        .andWhere('userRoles.role = :innovatorRole', { innovatorRole: ServiceRoleEnum.INNOVATOR })
        .getCount();
      if (!isTargetUserInnovator) {
        throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_TRANSFER_TARGET_USER_MUST_BE_INNOVATOR);
      }
    }

    // If all checks pass, create a new transfer request.
    const result = await connection.transaction(async transactionManager => {
      const transferObj = InnovationTransferEntity.new({
        email: targetUserEmail,
        emailCount: 1,
        status: InnovationTransferStatusEnum.PENDING,
        innovation: InnovationEntity.new({ id: innovationId }),
        createdBy: requestUser.id,
        updatedBy: requestUser.id,
        ownerToCollaborator: ownerToCollaborator
      });
      const transfer = await transactionManager.save(InnovationTransferEntity, transferObj);

      await this.notifierService.send(domainContext, NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_CREATION, {
        innovationId: innovation.id,
        transferId: transfer.id
      });

      return { id: transfer.id };
    });

    return result;
  }

  async updateInnovationTransferStatus(
    requestUser: { id: string; identityId: string },
    domainContext: DomainContextType,
    transferId: string,
    status:
      | InnovationTransferStatusEnum.CANCELED
      | InnovationTransferStatusEnum.DECLINED
      | InnovationTransferStatusEnum.COMPLETED,
    entityManager?: EntityManager
  ): Promise<{ id: string }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const filter: TransferQueryFilterType = {
      id: transferId,
      status: InnovationTransferStatusEnum.PENDING
    };

    switch (status) {
      case InnovationTransferStatusEnum.CANCELED: // Only the transfer creator, can CANCEL it.
        filter.createdBy = requestUser.id;
        break;
      case InnovationTransferStatusEnum.COMPLETED:
      case InnovationTransferStatusEnum.DECLINED:
        filter.email = (await this.identityProviderService.getUserInfo(requestUser.identityId)).email;
        break;
      default:
        throw new BadRequestError(GenericErrorsEnum.INVALID_PAYLOAD);
    }

    const transfer = await this.buildTransferQuery(filter, connection).getOne();
    if (!transfer) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_TRANSFER_NOT_FOUND);
    }

    // Update the transfer with new status & innovation with new owner if status is complete
    return connection.transaction(async transaction => {
      const savedTransfer = await transaction.save(InnovationTransferEntity, {
        ...transfer,
        status,
        updatedBy: requestUser.id,
        finishedAt: new Date().toISOString()
      });

      // COMPLETED transfer flow
      if (status === InnovationTransferStatusEnum.COMPLETED) {
        const innovation = await this.domainService.innovations.getInnovationInfo(transfer.innovation.id);

        // It should run if we have an owner and update its status as collaborator
        if (innovation && innovation.owner) {
          await this.collaboratorsService.upsertCollaborator(
            domainContext,
            {
              innovationId: transfer.innovation.id,
              email: (await this.identityProviderService.getUserInfo(innovation.owner.identityId)).email,
              userId: innovation.owner.id,
              status: transfer.ownerToCollaborator
                ? InnovationCollaboratorStatusEnum.ACTIVE
                : InnovationCollaboratorStatusEnum.LEFT
            },
            transaction
          );
        }

        await transaction.update(
          InnovationEntity,
          { id: transfer.innovation.id },
          {
            owner: { id: requestUser.id },
            updatedBy: requestUser.id,
            expires_at: null
          }
        );

        await this.collaboratorsService.deleteCollaborator(transfer.innovation.id, transfer.email, transaction);

        await this.domainService.innovations.addActivityLog(
          transaction,
          {
            innovationId: transfer.innovation.id,
            activity: ActivityEnum.OWNERSHIP_TRANSFER,
            domainContext
          },
          {
            interveningUserId: innovation?.owner?.id ?? null
          }
        );
      }

      // DECLINED transfer flow
      if (status === InnovationTransferStatusEnum.DECLINED) {
        const innovation = await this.domainService.innovations.getInnovationInfo(transfer.innovation.id);

        // It should run if there is no innovation owner
        if (innovation && !innovation.owner) {
          const domainContext = await this.domainService.users.getInnovatorDomainContextByRoleId(
            transfer.createdBy,
            transaction
          );
          if (domainContext) {
            await this.domainService.innovations.archiveInnovationsWithDeleteSideffects(
              domainContext,
              [
                {
                  id: innovation.id,
                  reason: InnovationArchiveReasonEnum.OWNER_ACCOUNT_DELETED
                }
              ],
              transaction
            );
          }
        }
      }

      // It should send a notification for all cases
      await this.notifierService.send(domainContext, NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_COMPLETED, {
        innovationId: transfer.innovation.id,
        transferId: transfer.id
      });

      return { id: savedTransfer.id };
    });
  }
}
