import type { Context } from '@azure/functions';
import type { NotifierTypeEnum } from '@notifications/shared/enums';
import { ServiceRoleEnum } from '@notifications/shared/enums';
import type { IdentityProviderService } from '@notifications/shared/services';
import SHARED_SYMBOLS from '@notifications/shared/services/symbols';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { container } from '../../_config';

import { createAccountUrl, dashboardUrl } from '../../_helpers/url.helper';
import { BaseHandler } from '../base.handler';
import { randomUUID } from 'crypto';

export class InnovationTransferOwnershipReminderHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_REMINDER,
  'AU07_TRANSFER_ONE_WEEK_REMINDER_NEW_USER' | 'AU08_TRANSFER_ONE_WEEK_REMINDER_EXISTING_USER'
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
      this.addEmails('AU07_TRANSFER_ONE_WEEK_REMINDER_NEW_USER', [{ email: this.inputData.recipientEmail }], {
        notificationPreferenceType: 'AUTOMATIC',
        params: {
          create_account_url: createAccountUrl(),
          innovation_name: this.inputData.innovationName
        }
      });
    } else {
      const userId = await this.recipientsService.identityId2UserId(targetUser.identityId);
      if (userId) {
        const recipient = await this.recipientsService.getUsersRecipient(userId, ServiceRoleEnum.INNOVATOR);

        if (recipient) {
          const notificationId = randomUUID();

          this.notify('AU08_TRANSFER_ONE_WEEK_REMINDER_EXISTING_USER', [recipient], {
            email: {
              notificationPreferenceType: 'AUTOMATIC',
              params: {
                innovation_name: this.inputData.innovationName,
                dashboard_url: dashboardUrl(ServiceRoleEnum.INNOVATOR, notificationId)
              }
            },
            inApp: {
              context: {
                detail: 'AU08_TRANSFER_ONE_WEEK_REMINDER_EXISTING_USER',
                id: this.inputData.innovationId,
                type: 'AUTOMATIC'
              },
              innovationId: this.inputData.innovationId,
              params: {
                innovationName: this.inputData.innovationName
              },
              notificationId
            }
          });
        }
      }
    }

    return this;
  }
}
