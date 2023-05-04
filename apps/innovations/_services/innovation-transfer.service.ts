import { inject, injectable } from 'inversify';
import type { SelectQueryBuilder } from 'typeorm';

import {
  InnovationEntity,
  InnovationTransferEntity,
  UserEntity,
} from '@innovations/shared/entities';
import {
  ActivityEnum,
  InnovationCollaboratorStatusEnum,
  InnovationTransferStatusEnum,
  NotifierTypeEnum,
  ServiceRoleEnum,
} from '@innovations/shared/enums';
import {
  BadRequestError,
  GenericErrorsEnum,
  InnovationErrorsEnum,
  UnprocessableEntityError,
} from '@innovations/shared/errors';
import {
  DomainServiceSymbol,
  IdentityProviderServiceSymbol,
  NotifierServiceSymbol,
  type DomainServiceType,
  type IdentityProviderServiceType,
  type NotifierServiceType,
} from '@innovations/shared/services';

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
    @inject(IdentityProviderServiceSymbol)
    private identityProviderService: IdentityProviderServiceType,
    @inject(DomainServiceSymbol) private domainService: DomainServiceType,
    @inject(NotifierServiceSymbol) private notifierService: NotifierServiceType,
    @inject(SYMBOLS.InnovationCollaboratorsService)
    private collaboratorsService: InnovationCollaboratorsService
  ) {
    super();
  }

  private buildTransferQuery(
    filter: TransferQueryFilterType
  ): SelectQueryBuilder<InnovationTransferEntity> {
    const query = this.sqlConnection
      .createQueryBuilder(InnovationTransferEntity, 'innovationTransfer')
      .innerJoinAndSelect('innovationTransfer.innovation', 'innovation')
      .where('DATEDIFF(day, innovationTransfer.created_at, GETDATE()) < 31');

    if (filter.id) {
      query.andWhere('innovationTransfer.id = :id', { id: filter.id });
    }
    if (filter.innovationId) {
      query.andWhere('innovationTransfer.innovation_id = :innovationId', {
        innovationId: filter.innovationId,
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
    assignedToMe?: boolean
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

    const transfers = await this.buildTransferQuery(filter).getMany();

    return Promise.all(
      transfers.map(async (transfer) => {
        try {
          const createdBy = await this.domainService.users.getUserInfo({
            userId: transfer.createdBy,
          });

          return {
            id: transfer.id,
            email: transfer.email,
            innovation: {
              id: transfer.innovation.id,
              name: transfer.innovation.name,
              owner: createdBy.displayName,
            },
          };
        } catch (_) {
          return {
            id: transfer.id,
            email: transfer.email,
            innovation: {
              id: transfer.innovation.id,
              name: transfer.innovation.name,
            },
          };
        }
      })
    );
  }

  async getPendingInnovationTransferInfo(id: string): Promise<{ userExists: boolean }> {
    const dbTranfer = await this.buildTransferQuery({
      id,
      status: InnovationTransferStatusEnum.PENDING,
    }).getOne();
    if (!dbTranfer) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_TRANSFER_NOT_FOUND);
    }

    try {
      const authUser = await this.identityProviderService.getUserInfoByEmail(dbTranfer.email);

      return { userExists: !!authUser?.identityId };
    } catch (error) {
      return { userExists: false };
    }
  }

  async getInnovationTransferInfo(id: string): Promise<{
    id: string;
    email: string;
    innovation: { id: string; name: string; owner: { name: string } };
  }> {
    const transfer = await this.buildTransferQuery({
      id,
      status: InnovationTransferStatusEnum.PENDING,
    }).getOne();
    if (!transfer) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_TRANSFER_NOT_FOUND);
    }

    const transferOwner = await this.domainService.users.getUserInfo({
      userId: transfer.createdBy,
    });

    return {
      id: transfer.id,
      email: transfer.email,
      innovation: {
        id: transfer.innovation.id,
        name: transfer.innovation.name,
        owner: { name: transferOwner.displayName },
      },
    };
  }

  async createInnovationTransfer(
    requestUser: { id: string; identityId: string },
    domainContext: DomainContextType,
    innovationId: string,
    targetUserEmail: string,
    ownerToCollaborator: boolean
  ): Promise<{ id: string }> {
    // Get innovation information.
    const innovation = await this.sqlConnection
      .createQueryBuilder(InnovationEntity, 'innovation')
      .select(['innovation.id'])
      .where('innovation.id = :innovationId', { innovationId })
      .getOne();
    if (!innovation) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    // Check if a transfer request if already raised.
    const transfer = await this.buildTransferQuery({
      innovationId,
      status: InnovationTransferStatusEnum.PENDING,
    }).getOne();
    if (transfer) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_TRANSFER_ALREADY_EXISTS);
    }

    // Request user cannot transfer the innovation to himself.
    const targetUser = await this.identityProviderService.getUserInfoByEmail(targetUserEmail);
    if (targetUser && targetUser.identityId === requestUser.identityId) {
      throw new UnprocessableEntityError(
        InnovationErrorsEnum.INNOVATION_TRANSFER_REQUESTED_FOR_SELF
      );
    }

    // Check if target user is an Innovator
    const isTargetUserInnovator = await this.sqlConnection
      .createQueryBuilder(UserEntity, 'user')
      .innerJoin('user.serviceRoles', 'userRoles')
      .where('user.identityId = :identityId', { identityId: targetUser?.identityId })
      .andWhere('userRoles.role = :innovatorRole', { innovatorRole: ServiceRoleEnum.INNOVATOR })
      .getCount();
    if (!isTargetUserInnovator) {
      throw new UnprocessableEntityError(
        InnovationErrorsEnum.INNOVATION_TRANSFER_TARGET_USER_MUST_BE_INNOVATOR
      );
    }

    // If all checks pass, create a new transfer request.
    const result = await this.sqlConnection.transaction(async (transactionManager) => {
      const transferObj = InnovationTransferEntity.new({
        email: targetUserEmail,
        emailCount: 1,
        status: InnovationTransferStatusEnum.PENDING,
        innovation: InnovationEntity.new({ id: innovationId }),
        createdBy: requestUser.id,
        updatedBy: requestUser.id,
        ownerToCollaborator: ownerToCollaborator,
      });
      const transfer = await transactionManager.save(InnovationTransferEntity, transferObj);

      await this.notifierService.send(
        { id: requestUser.id, identityId: requestUser.identityId },
        NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_CREATION,
        {
          innovationId: innovation.id,
          transferId: transfer.id,
        },
        domainContext
      );

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
      | InnovationTransferStatusEnum.COMPLETED
  ): Promise<{ id: string }> {
    const filter: TransferQueryFilterType = {
      id: transferId,
      status: InnovationTransferStatusEnum.PENDING,
    };

    switch (status) {
      case InnovationTransferStatusEnum.CANCELED: // Only the transfer creator, can CANCEL it.
        filter.createdBy = requestUser.id;
        break;
      case InnovationTransferStatusEnum.COMPLETED:
      case InnovationTransferStatusEnum.DECLINED:
        filter.email = (
          await this.identityProviderService.getUserInfo(requestUser.identityId)
        ).email;
        break;
      default:
        throw new BadRequestError(GenericErrorsEnum.INVALID_PAYLOAD);
    }

    const transfer = await this.buildTransferQuery(filter).getOne();
    if (!transfer) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_TRANSFER_NOT_FOUND);
    }

    // Update the transfer with new status & innovation with new owner if status is complete
    return this.sqlConnection.transaction(async (transactionManager) => {
      const savedTransfer = await transactionManager.save(InnovationTransferEntity, {
        ...transfer,
        status,
        updatedBy: requestUser.id,
        finishedAt: new Date().toISOString(),
      });

      // COMPLETED transfer flow
      if (status === InnovationTransferStatusEnum.COMPLETED) {
        const innovation = await this.domainService.innovations.getInnovationInfo(
          transfer.innovation.id
        );

        // It should run if we have an owner and update its status as collaborator
        if (innovation && innovation.owner) {
          await this.collaboratorsService.upsertCollaborator(domainContext, {
            innovationId: transfer.innovation.id,
            email: (
              await this.identityProviderService.getUserInfo(innovation.owner.identityId)
            ).email,
            userId: innovation.owner.id,
            status: transfer.ownerToCollaborator
              ? InnovationCollaboratorStatusEnum.ACTIVE
              : InnovationCollaboratorStatusEnum.LEFT,
          });
        }

        await transactionManager.update(
          InnovationEntity,
          { id: transfer.innovation.id },
          {
            owner: { id: requestUser.id },
            updatedBy: requestUser.id,
            expires_at: null,
          }
        );

        await this.collaboratorsService.deleteCollaborator(transfer.innovation.id, transfer.email);

        await this.domainService.innovations.addActivityLog(
          transactionManager,
          {
            innovationId: transfer.innovation.id,
            activity: ActivityEnum.OWNERSHIP_TRANSFER,
            domainContext,
          },
          {
            interveningUserId: innovation?.owner?.id ?? null,
          }
        );
      }

      // DECLINED transfer flow
      if (status === InnovationTransferStatusEnum.DECLINED) {
        const innovation = await this.domainService.innovations.getInnovationInfo(
          transfer.innovation.id
        );

        // It should run if there is no innovation owner
        if (innovation && !innovation.owner) {
          await this.domainService.innovations.withdrawInnovations(
            { id: '', roleId: '' },
            [{ id: transfer.innovation.id, reason: null }],
            transactionManager
          );
        }
      }

      // It should send a notification for all cases
      await this.notifierService.send(
        { id: requestUser.id, identityId: requestUser.identityId },
        NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_COMPLETED,
        { innovationId: transfer.innovation.id, transferId: transfer.id },
        domainContext
      );

      return { id: savedTransfer.id };
    });
  }
}
