import {
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
  NotifierTypeEnum,
  ServiceRoleEnum
} from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import { IdentityProviderServiceSymbol, IdentityProviderServiceType } from '@notifications/shared/services';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { container, EmailTypeEnum, ENV } from '../_config';

import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';
import { BaseHandler } from './base.handler';

export class InnovationTransferOwnershipReminderHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_REMINDER,
  EmailTypeEnum.INNOVATION_TRANSFER_REMINDER_NEW_USER | EmailTypeEnum.INNOVATION_TRANSFER_REMINDER_EXISTING_USER,
  Record<string, never>
> {
  private identityProviderService = container.get<IdentityProviderServiceType>(IdentityProviderServiceSymbol);
  private recipientsService = container.get<RecipientsServiceType>(RecipientsServiceSymbol);

  constructor(
    requestUser: { id: string; identityId: string },
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_REMINDER],
    domainContext: DomainContextType
  ) {
    super(requestUser, data, domainContext);
  }

  async run(): Promise<this> {
    const targetUser = await this.identityProviderService.getUserInfoByEmail(this.inputData.recipientEmail);

    if (!targetUser) {
      // This means that the user is NOT registered in the service.
      this.emails.push({
        templateId: EmailTypeEnum.INNOVATION_TRANSFER_REMINDER_NEW_USER,
        to: { type: 'email', value: this.inputData.recipientEmail },
        params: {
          innovation_name: this.inputData.innovationName,
          transfer_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath(`transfers/${this.inputData.transferId}`)
            .buildUrl()
        }
      });
    } else {
      this.emails.push({
        templateId: EmailTypeEnum.INNOVATION_TRANSFER_REMINDER_EXISTING_USER,
        to: { type: 'identityId', value: targetUser.identityId },
        params: {
          innovation_name: this.inputData.innovationName,
          transfer_url: new UrlModel(ENV.webBaseTransactionalUrl).addPath('innovator/dashboard').buildUrl()
        }
      });

      const userId = await this.recipientsService.identityId2UserId(targetUser.identityId);
      if (userId) {
        const userRole = await this.recipientsService.getUserRole(userId, ServiceRoleEnum.INNOVATOR);

        if (userRole) {
          this.inApp.push({
            innovationId: this.inputData.innovationId,
            context: {
              type: NotificationContextTypeEnum.INNOVATION,
              detail: NotificationContextDetailEnum.TRANSFER_EXPIRED,
              id: this.inputData.transferId
            },
            userRoleIds: [userRole.id],
            params: {}
          });
        }
      }
    }

    return this;
  }
}
