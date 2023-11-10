import type { Context } from '@azure/functions';
import { NotificationCategoryEnum, ServiceRoleEnum, type NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import { innovationOverviewUrl } from '../../../_helpers/url.helper';
import { BaseHandler } from '../../base.handler';

export class AccountDeletionHandler extends BaseHandler<
  NotifierTypeEnum.ACCOUNT_DELETION,
  'DA01_OWNER_DELETED_ACCOUNT_WITH_PENDING_TRANSFER_TO_COLLABORATOR'
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.ACCOUNT_DELETION],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    for (const innovation of this.inputData.innovations) {
      await this.DA01_OWNER_DELETED_ACCOUNT_WITH_PENDING_TRANSFER_TO_COLLABORATOR(innovation);
    }
    return this;
  }

  private async DA01_OWNER_DELETED_ACCOUNT_WITH_PENDING_TRANSFER_TO_COLLABORATOR(
    innovation: NotifierTemplatesType[NotifierTypeEnum.ACCOUNT_DELETION]['innovations'][number]
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
            type: NotificationCategoryEnum.INNOVATION_MANAGEMENT,
            detail: 'DA01_OWNER_DELETED_ACCOUNT_WITH_PENDING_TRANSFER_TO_COLLABORATOR'
          },
          innovationId: innovation.id,
          params: { innovationName: innovation.name }
        }
      });
    }
  }
}
