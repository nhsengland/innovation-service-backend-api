import { inject, injectable } from 'inversify';
import type { SelectQueryBuilder } from 'typeorm';

import { InnovationEntity, InnovationTransferEntity } from '@innovations/shared/entities';
import { ActivityEnum, InnovationTransferStatusEnum, NotifierTypeEnum, UserTypeEnum } from '@innovations/shared/enums';
import { BadRequestError, GenericErrorsEnum, InnovationErrorsEnum, UnprocessableEntityError } from '@innovations/shared/errors';
import { DomainServiceSymbol, IdentityProviderServiceSymbol, NotifierServiceSymbol, type DomainServiceType, type IdentityProviderServiceType, type NotifierServiceType } from '@innovations/shared/services';

import { BaseService } from './base.service';


type TransferQueryFilterType = {
  id?: string,
  innovationId?: string,
  status?: InnovationTransferStatusEnum,
  email?: string,
  createdBy?: string
};


@injectable()
export class InnovationTransferService extends BaseService {

  constructor(
    @inject(IdentityProviderServiceSymbol) private identityProviderService: IdentityProviderServiceType,
    @inject(DomainServiceSymbol) private domainService: DomainServiceType,
    @inject(NotifierServiceSymbol) private notifierService: NotifierServiceType
  ) { super(); }


  private buildTransferQuery(filter: TransferQueryFilterType): SelectQueryBuilder<InnovationTransferEntity> {

    const query = this.sqlConnection.createQueryBuilder(InnovationTransferEntity, 'innovationTransfer')
      .innerJoinAndSelect('innovationTransfer.innovation', 'innovation')
      .where('DATEDIFF(day, innovationTransfer.created_at, GETDATE()) < 31');

    if (filter.id) { query.andWhere('innovationTransfer.id = :id', { id: filter.id }); }
    if (filter.innovationId) { query.andWhere('innovationTransfer.innovation_id = :innovationId', { innovationId: filter.innovationId }); }
    if (filter.status) { query.andWhere('innovationTransfer.status = :status', { status: filter.status }); }
    if (filter.email) { query.andWhere('innovationTransfer.email = :email', { email: filter.email }); }
    if (filter.createdBy) { query.andWhere('innovationTransfer.created_by = :createdBy', { createdBy: filter.createdBy }); }

    return query;

  }


  async getInnovationTransfersList(requestUserId: string, assignedToMe?: boolean): Promise<{
    id: string, email: string,
    innovation: { id: string, name: string, owner: string }
  }[]> {

    const filter: TransferQueryFilterType = { status: InnovationTransferStatusEnum.PENDING };

    if (assignedToMe) {
      filter.email = (await this.domainService.users.getUserInfo({ userId: requestUserId })).email;
    }
    else {
      filter.createdBy = requestUserId;
    }

    const transfers = await this.buildTransferQuery(filter).getMany();

    return Promise.all(transfers.map(async transfer => {

      const createdBy = await this.domainService.users.getUserInfo({ userId: transfer.createdBy });
      const identiyUser = await this.identityProviderService.getUserInfo(createdBy.identityId);

      return {
        id: transfer.id,
        email: transfer.email,
        innovation: {
          id: transfer.innovation.id,
          name: transfer.innovation.name,
          owner: identiyUser.displayName
        }
      };

    }));

  }

  async getPendingInnovationTransferInfo(id: string): Promise<{ userExists: boolean }> {

    const dbTranfer = await this.buildTransferQuery({ id, status: InnovationTransferStatusEnum.PENDING }).getOne();
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
    id: string,
    email: string,
    innovation: { id: string, name: string, owner: { name: string } }
  }> {

    const transfer = await this.buildTransferQuery({ id, status: InnovationTransferStatusEnum.PENDING }).getOne();
    if (!transfer) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_TRANSFER_NOT_FOUND);
    }

    const transferOwner = await this.domainService.users.getUserInfo({ userId: transfer.createdBy });

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
    requestUser: { id: string, identityId: string, type: UserTypeEnum },
    innovationId: string,
    targetUserEmail: string
  ): Promise<{ id: string }> {

    // Get innovation information.
    const innovation = await this.sqlConnection.getRepository(InnovationEntity).findOne({ where: { id: innovationId } });
    if (!innovation) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    // Check if a transfer request if already raised.
    const transfer = await this.buildTransferQuery({ innovationId, status: InnovationTransferStatusEnum.PENDING }).getOne();
    if (transfer) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_TRANSFER_ALREADY_EXISTS);
    }

    // Request user cannot transfer the innovation to himself.
    const targetUser = await this.identityProviderService.getUserInfoByEmail(targetUserEmail);
    if (targetUser && targetUser.identityId === requestUser.identityId) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_TRANSFER_REQUESTED_FOR_SELF);
    }

    // If all checks pass, create a new transfer request.
    const result = await this.sqlConnection.transaction(async transactionManager => {

      const transferObj = InnovationTransferEntity.new({
        email: targetUserEmail,
        emailCount: 1,
        status: InnovationTransferStatusEnum.PENDING,
        innovation: InnovationEntity.new({ id: innovationId }),
        createdBy: requestUser.id,
        updatedBy: requestUser.id,
      });
      const transfer = await transactionManager.save(InnovationTransferEntity, transferObj);


      await this.notifierService.send<NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_CREATION>({
        id: requestUser.id, identityId: requestUser.identityId, type: requestUser.type,
      },
        NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_CREATION, {
        innovationId: innovation.id,
        transferId: transfer.id,
      });

      return { id: transfer.id };
    });

    return result;

  }

  async updateInnovationTransferStatus(
    requestUser: { id: string, identityId: string, type: UserTypeEnum },
    transferId: string,
    status: InnovationTransferStatusEnum.CANCELED | InnovationTransferStatusEnum.DECLINED | InnovationTransferStatusEnum.COMPLETED
  ): Promise<{ id: string }> {

    const filter: TransferQueryFilterType = { id: transferId, status: InnovationTransferStatusEnum.PENDING };

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

    const transfer = await this.buildTransferQuery(filter).getOne();
    if (!transfer) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_TRANSFER_NOT_FOUND);
    }

    // Update the transfer with new status & innovation with new owner if status is complete
    return this.sqlConnection.transaction(async transactionManager => {

      const savedTransfer = await transactionManager.save(InnovationTransferEntity, {
        ...transfer,
        status,
        updatedBy: requestUser.id,
        finishedAt: new Date().toISOString()
      });

      if (status === InnovationTransferStatusEnum.COMPLETED) {

        await transactionManager.update(InnovationEntity,
          { id: transfer.innovation.id },
          {
            owner: { id: requestUser.id },
            updatedBy: requestUser.id,
          });

        await this.domainService.innovations.addActivityLog(
          transactionManager,
          { userId: requestUser.id, innovationId: transfer.innovation.id, activity: ActivityEnum.OWNERSHIP_TRANSFER },
          {
            interveningUserId: requestUser.identityId
          }
        );

      }

      // It should send a notification for all cases
      await this.notifierService.send<NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_COMPLETED>(
        { id: requestUser.id, identityId: requestUser.identityId, type: requestUser.type },
        NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_COMPLETED,
        { innovationId: transfer.innovation.id, transferId: transfer.id });

      return { id: savedTransfer.id };

    });

  }

}
