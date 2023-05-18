import { InnovationTransferStatusEnum, NotifierTypeEnum, ServiceRoleEnum } from '@notifications/shared/enums';
import type { IdentityProviderService } from '@notifications/shared/services';
import SHARED_SYMBOLS from '@notifications/shared/services/symbols';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { container } from '../_config';
import { EmailTypeEnum } from '../_config/emails.config';

import type { Context } from '@azure/functions';
import { BaseHandler } from './base.handler';

export class InnovationTransferOwnershipCompletedHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_COMPLETED,
  | EmailTypeEnum.INNOVATION_TRANSFER_COMPLETED_TO_ORIGINAL_OWNER
  | EmailTypeEnum.INNOVATION_TRANSFER_CANCELLED_TO_NEW_OWNER
  | EmailTypeEnum.INNOVATION_TRANSFER_DECLINED_TO_ORIGINAL_OWNER,
  Record<string, never>
> {
  private identityProviderService = container.get<IdentityProviderService>(SHARED_SYMBOLS.IdentityProviderService);

  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_COMPLETED],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);
    const innovationOwnerInfo = await this.recipientsService.usersIdentityInfo(innovation.ownerIdentityId);
    const transfer = await this.recipientsService.innovationTransferInfoWithOwner(this.inputData.transferId);
    const transferOwner = await this.recipientsService.getUsersRecipient(transfer.ownerId, ServiceRoleEnum.INNOVATOR);

    switch (transfer.status) {
      case InnovationTransferStatusEnum.COMPLETED:
        if (transferOwner) {
          const innovatorIdentity = await this.recipientsService.usersIdentityInfo(transferOwner?.identityId);

          this.emails.push({
            templateId: EmailTypeEnum.INNOVATION_TRANSFER_COMPLETED_TO_ORIGINAL_OWNER,
            to: transferOwner,
            notificationPreferenceType: null,
            params: {
              innovator_name: innovatorIdentity?.displayName ?? 'user', // Review what should happen if user is not found
              innovation_name: innovation.name,
              new_innovator_name: innovationOwnerInfo?.displayName ?? 'user', // Review what should happen if user is not found
              new_innovator_email: innovationOwnerInfo?.email ?? 'user email' //Review what should happen if user is not found
            }
          });
        }
        break;

      case InnovationTransferStatusEnum.CANCELED:
        // If the transfer canceled is a preference we need to figure out if the email is a user or not but that would
        // require extra work and not needed now.
        // 1. get the user info by email
        // 2. if user is found then use the user info to get the role and send to role
        // 3. if user is not found then use the email as the recipient
        this.emails.push({
          templateId: EmailTypeEnum.INNOVATION_TRANSFER_CANCELLED_TO_NEW_OWNER,
          to: { email: transfer.email },
          notificationPreferenceType: null,
          params: {
            innovator_name: innovationOwnerInfo?.displayName ?? 'user', //Review what should happen if user is not found
            innovation_name: innovation.name
          }
        });
        break;

      case InnovationTransferStatusEnum.DECLINED:
        // Review seems odd to use transferOwner for one thing but innovator_name for the body of the email
        if (transferOwner) {
          const targetUser = await this.identityProviderService.getUserInfoByEmail(transfer.email);
          this.emails.push({
            templateId: EmailTypeEnum.INNOVATION_TRANSFER_DECLINED_TO_ORIGINAL_OWNER,
            to: transferOwner,
            notificationPreferenceType: null,
            params: {
              innovator_name: innovationOwnerInfo?.displayName ?? 'user', // Review what should happen if user is not found
              new_innovator_name: targetUser?.displayName || transfer.email,
              innovation_name: innovation.name
            }
          });
        }
        break;
      default:
        break;
    }

    return this;
  }
}
