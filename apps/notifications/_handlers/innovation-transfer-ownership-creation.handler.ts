import { NotifierTypeEnum, ServiceRoleEnum } from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import type { IdentityProviderService } from '@notifications/shared/services';
import SHARED_SYMBOLS from '@notifications/shared/services/symbols';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { container, EmailTypeEnum, ENV } from '../_config';

import type { Context } from '@azure/functions';
import { BaseHandler } from './base.handler';

export class InnovationTransferOwnershipCreationHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_CREATION,
  EmailTypeEnum.INNOVATION_TRANSFER_TO_NEW_USER | EmailTypeEnum.INNOVATION_TRANSFER_TO_EXISTING_USER,
  Record<string, never>
> {
  private identityProviderService = container.get<IdentityProviderService>(SHARED_SYMBOLS.IdentityProviderService);

  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_CREATION],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);
    const innovationOwnerInfo = await this.recipientsService.usersIdentityInfo(innovation.ownerIdentityId);
    const transfer = await this.recipientsService.innovationTransferInfoWithOwner(this.inputData.transferId);

    const targetUser = await this.identityProviderService.getUserInfoByEmail(transfer.email);

    if (!targetUser) {
      // This means that the user is NOT registered in the service.

      this.emails.push({
        templateId: EmailTypeEnum.INNOVATION_TRANSFER_TO_NEW_USER,
        to: { email: transfer.email },
        notificationPreferenceType: null,
        params: {
          innovator_name: innovationOwnerInfo?.displayName ?? 'user', //Review what should happen if user is not found
          innovation_name: innovation.name,
          transfer_url: new UrlModel(ENV.webBaseTransactionalUrl).addPath(`transfers/${transfer.id}`).buildUrl()
        }
      });
    } else {
      const recipientId = await this.recipientsService.identityId2UserId(targetUser.identityId);
      if (recipientId) {
        const recipient = await this.recipientsService.getUsersRecipient(recipientId, ServiceRoleEnum.INNOVATOR);
        if (recipient) {
          this.emails.push({
            templateId: EmailTypeEnum.INNOVATION_TRANSFER_TO_EXISTING_USER,
            to: recipient,
            notificationPreferenceType: null,
            params: {
              innovator_name: innovationOwnerInfo?.displayName ?? 'user', //Review what should happen if user is not found
              innovation_name: innovation.name,
              transfer_url: new UrlModel(ENV.webBaseTransactionalUrl).addPath('innovator/dashboard').buildUrl()
            }
          });
        }
      }
    }

    return this;
  }
}
