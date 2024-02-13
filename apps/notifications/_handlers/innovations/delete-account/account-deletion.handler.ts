import type { Context } from '@azure/functions';
import { ServiceRoleEnum, type NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import { innovationOverviewUrl } from '../../../_helpers/url.helper';
import { BaseHandler } from '../../base.handler';

export class AccountDeletionHandler extends BaseHandler<
  NotifierTypeEnum.ACCOUNT_DELETION,
  | 'DA01_OWNER_DELETED_ACCOUNT_WITH_PENDING_TRANSFER_TO_COLLABORATOR'
  | 'DA02_OWNER_DELETED_ACCOUNT_WITHOUT_PENDING_TRANSFER_TO_COLLABORATOR'
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.ACCOUNT_DELETION],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    if (this.inputData.innovations.withPendingTransfer.length) {
      for (const innovation of this.inputData.innovations.withPendingTransfer) {
        await this.DA01_OWNER_DELETED_ACCOUNT_WITH_PENDING_TRANSFER_TO_COLLABORATOR(innovation);
      }
    }

    if (this.inputData.innovations.withoutPendingTransfer.length) {
      for (const innovation of this.inputData.innovations.withoutPendingTransfer) {
        await this.DA02_OWNER_DELETED_ACCOUNT_WITHOUT_PENDING_TRANSFER_TO_COLLABORATOR(innovation);
      }
    }

    return this;
  }

  private async DA01_OWNER_DELETED_ACCOUNT_WITH_PENDING_TRANSFER_TO_COLLABORATOR(
    innovation: NotifierTemplatesType[NotifierTypeEnum.ACCOUNT_DELETION]['innovations']['withPendingTransfer'][number]
  ): Promise<void> {
    const collaborators = await this.recipientsService.getInnovationActiveCollaborators(innovation.id);
    if (collaborators.length > 0) {
      const recipients = await this.recipientsService.getUsersRecipient(collaborators, ServiceRoleEnum.INNOVATOR);

      this.notify('DA01_OWNER_DELETED_ACCOUNT_WITH_PENDING_TRANSFER_TO_COLLABORATOR', recipients, {
        email: {
          notificationPreferenceType: null,
          params: {
            expiry_date: innovation.transferExpireDate,
            innovation_name: innovation.name,
            innovation_overview_url: innovationOverviewUrl(ServiceRoleEnum.INNOVATOR, innovation.id)
          }
        },
        inApp: {
          context: {
            id: this.requestUser.id,
            type: 'INNOVATION_MANAGEMENT',
            detail: 'DA01_OWNER_DELETED_ACCOUNT_WITH_PENDING_TRANSFER_TO_COLLABORATOR'
          },
          innovationId: innovation.id,
          params: { innovationName: innovation.name }
        }
      });
    }
  }

  private async DA02_OWNER_DELETED_ACCOUNT_WITHOUT_PENDING_TRANSFER_TO_COLLABORATOR(
    innovation: NotifierTemplatesType[NotifierTypeEnum.ACCOUNT_DELETION]['innovations']['withoutPendingTransfer'][number]
  ): Promise<void> {
    const collaborators = await this.recipientsService.getInnovationActiveCollaborators(innovation.id);
    if (collaborators.length > 0) {
      const recipients = await this.recipientsService.getUsersRecipient(collaborators, ServiceRoleEnum.INNOVATOR);

      this.notify('DA02_OWNER_DELETED_ACCOUNT_WITHOUT_PENDING_TRANSFER_TO_COLLABORATOR', recipients, {
        email: {
          notificationPreferenceType: null,
          params: {
            innovation_name: innovation.name
          }
        },
        inApp: {
          context: {
            id: this.requestUser.id,
            type: 'INNOVATION_MANAGEMENT',
            detail: 'DA02_OWNER_DELETED_ACCOUNT_WITHOUT_PENDING_TRANSFER_TO_COLLABORATOR'
          },
          innovationId: innovation.id,
          params: { innovationName: innovation.name }
        }
      });
    }
  }
}
