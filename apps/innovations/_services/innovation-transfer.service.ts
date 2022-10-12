import { InnovationEntity, InnovationTransferEntity } from '@innovations/shared/entities';
import { ActivityEnum, InnovationTransferStatusEnum, NotifierTypeEnum, UserTypeEnum } from '@innovations/shared/enums';
import { UnprocessableEntityError, InnovationErrorsEnum, BadRequestError, GenericErrorsEnum } from '@innovations/shared/errors';
import { IdentityProviderServiceSymbol, type IdentityProviderServiceType, DomainServiceSymbol, type DomainServiceType, NotifierServiceSymbol, type NotifierServiceType } from '@innovations/shared/services';
import { inject, injectable } from 'inversify';
import type { EntityManager, Repository, SelectQueryBuilder } from 'typeorm';

import { BaseAppService } from './base-app.service';


type QueryFilter = {
  id?: string;
  innovationId?: string;
  status?: InnovationTransferStatusEnum;
  email?: string;
  createdBy?: string;
}

@injectable()
export class InnovationTransferService extends BaseAppService {

  innovationRepository: Repository<InnovationEntity>;
  innovationTransferRepository: Repository<InnovationTransferEntity>;

  constructor(
    @inject(IdentityProviderServiceSymbol) private identityProviderService: IdentityProviderServiceType,
    @inject(DomainServiceSymbol) private domainService: DomainServiceType,
    @inject(NotifierServiceSymbol) private notfifierService: NotifierServiceType
  ) {
    super();
    this.innovationRepository = this.sqlConnection.getRepository<InnovationEntity>(InnovationEntity);
    this.innovationTransferRepository = this.sqlConnection.getRepository<InnovationTransferEntity>(InnovationTransferEntity);
  }

  async getInnovationTransfersList(requestUserId: string, assignedToMe?: boolean): Promise<{
    id: string,
    email: string,
    innovation: {
      id: string,
      name: string,
      owner: string
    }
  }[]> {

    const filter: QueryFilter = {
      status: InnovationTransferStatusEnum.PENDING,
    };

    if (assignedToMe) {
      const identiyProviderUser = await this.domainService.users.getUserInfo({ userId: requestUserId });
      filter.email = identiyProviderUser.email;
    }
    else {
      filter.createdBy = requestUserId;
    }

    const transfers = await this.createGetTransferQuery(filter).getMany();

    const result = await Promise.all(transfers.map(async transfer => {
      const identiyProviderUser = await this.identityProviderService.getUserInfo(transfer.createdBy);
      return {
        id: transfer.id,
        email: transfer.email,
        innovation: {
          id: transfer.innovation.id,
          name: transfer.innovation.name,
          owner: identiyProviderUser.displayName
        }
      };
    }));

    return result;
  }

  // TODO: Check access innovation / transfer.
  async getInnovationTransferInfo(transferId: string): Promise<{
    id: string,
    email: string,
    innovation: { id: string, name: string, owner: { name: string } }
  }> {

    const transfer = await this.createGetTransferQuery({ id: transferId, status: InnovationTransferStatusEnum.PENDING }).getOne();
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
    const innovation = await this.innovationRepository.findOne({ where: { id: innovationId } });
    if (!innovation) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    // Check if a transfer request if already raised.
    const transfer = await this.createGetTransferQuery({ innovationId, status: InnovationTransferStatusEnum.PENDING }).getOne();
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


      this.notfifierService.send({
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
    status: InnovationTransferStatusEnum
  ): Promise<void> {

    let targetUser!: {
      identityId: string,
      displayName: string,
      email: string,
    };

    //Forming query to fetch transfer to update
    const filter: QueryFilter = {
      id: transferId,
      status: InnovationTransferStatusEnum.PENDING,
    };

    switch (status) {
      case InnovationTransferStatusEnum.CANCELED:
        filter.createdBy = requestUser.id;
        break;
      case InnovationTransferStatusEnum.COMPLETED:
      case InnovationTransferStatusEnum.DECLINED:
        targetUser = await this.identityProviderService.getUserInfo(requestUser.id);
        filter.email = targetUser.email;
        break;
      default:
        throw new BadRequestError(GenericErrorsEnum.INVALID_PAYLOAD);
    }

    const transfer = await this.createGetTransferQuery(filter).getOne();
    if (!transfer) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_TRANSFER_NOT_FOUND);
    }

    // Update the transfer with new status & innovation with new owner if status is complete
    await this.sqlConnection.transaction(async (transactionManager: EntityManager) => {

      if (status === InnovationTransferStatusEnum.COMPLETED) {

        await transactionManager.update(InnovationEntity,
          { id: transfer.innovation.id },
          {
            owner: { id: requestUser.id },
            updatedBy: requestUser.id,
          });

        await this.domainService.innovations.addActivityLog<'OWNERSHIP_TRANSFER'>(
          transactionManager,
          { userId: requestUser.id, innovationId: transfer.innovation.id, activity: ActivityEnum.OWNERSHIP_TRANSFER },
          {
            interveningUserId: targetUser.identityId
          }
        );

        this.sendTransferConfirmationEmail({ id: requestUser.id, identityId: requestUser.identityId, type: requestUser.type }, transfer);
      }

      transfer.status = status;
      transfer.updatedBy = requestUser.id;
      transfer.finishedAt = new Date().toISOString();

      await transactionManager.save(
        InnovationTransferEntity,
        transfer
      );
    });
  }

  private createGetTransferQuery(filter: QueryFilter): SelectQueryBuilder<InnovationTransferEntity> {
    const query = this.innovationTransferRepository
      .createQueryBuilder('innovationTransfer')
      .innerJoinAndSelect('innovationTransfer.innovation', 'innovation')
      .where('DATEDIFF(day, innovationTransfer.created_at, GETDATE()) < 31');

    if (filter.id) {
      query.andWhere('innovationTransfer.id = :id', {
        id: filter.id,
      });
    }

    if (filter.innovationId) {
      query.andWhere('innovationTransfer.innovation_id = :innovationId', {
        innovationId: filter.innovationId,
      });
    }

    if (filter.status) {
      query.andWhere('innovationTransfer.status = :status', {
        status: filter.status,
      });
    }

    if (filter.email) {
      query.andWhere('innovationTransfer.email = :email', {
        email: filter.email,
      });
    }

    if (filter.createdBy) {
      query.andWhere('innovationTransfer.created_by = :createdBy', {
        createdBy: filter.createdBy,
      });
    }

    return query;
  }

  private async sendTransferConfirmationEmail(
    requestUser: { id: string, identityId: string, type: UserTypeEnum },
    transfer: InnovationTransferEntity,): Promise<void> {

    // Send email notification to the origin user if transfer is completed
    this.notfifierService.send({
      id: requestUser.id, identityId: requestUser.identityId, type: requestUser.type,
    },
      NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_COMPLETED, {
      innovationId: transfer.innovation.id,
      transferId: transfer.id,
    });

  }

}
