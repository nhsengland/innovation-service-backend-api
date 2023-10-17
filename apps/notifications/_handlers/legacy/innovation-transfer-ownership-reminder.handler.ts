import {
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
  NotifierTypeEnum,
  ServiceRoleEnum
} from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import type { IdentityProviderService } from '@notifications/shared/services';
import SHARED_SYMBOLS from '@notifications/shared/services/symbols';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { container, ENV } from '../../_config';

import type { Context } from '@azure/functions';
import { BaseHandler } from '../base.handler';

export class InnovationTransferOwnershipReminderHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_REMINDER,
  'MIGRATION_OLD'
> {
  private identityProviderService = container.get<IdentityProviderService>(SHARED_SYMBOLS.IdentityProviderService);

  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_REMINDER],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const targetUser = await this.identityProviderService.getUserInfoByEmail(this.inputData.recipientEmail);

    if (!targetUser) {
      // This means that the user is NOT registered in the service.
      this.emails.push({
        templateId: 'INNOVATION_TRANSFER_REMINDER_NEW_USER',
        to: { email: this.inputData.recipientEmail },
        notificationPreferenceType: null,
        params: {
          innovation_name: this.inputData.innovationName,
          transfer_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath(`transfers/${this.inputData.transferId}`)
            .buildUrl()
        }
      });
    } else {
      const userId = await this.recipientsService.identityId2UserId(targetUser.identityId);
      if (userId) {
        const recipient = await this.recipientsService.getUsersRecipient(userId, ServiceRoleEnum.INNOVATOR);

        if (recipient) {
          this.emails.push({
            templateId: 'INNOVATION_TRANSFER_REMINDER_EXISTING_USER',
            to: recipient,
            notificationPreferenceType: null,
            params: {
              innovation_name: this.inputData.innovationName,
              transfer_url: new UrlModel(ENV.webBaseTransactionalUrl).addPath('innovator/dashboard').buildUrl()
            }
          });

          this.inApp.push({
            innovationId: this.inputData.innovationId,
            context: {
              type: NotificationContextTypeEnum.INNOVATION,
              detail: NotificationContextDetailEnum.TRANSFER_REMINDER,
              id: this.inputData.transferId
            },
            userRoleIds: [recipient.roleId],
            params: {}
          });
        }
      }
    }

    return this;
  }
}
