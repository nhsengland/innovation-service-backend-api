import { InnovationTransferStatusEnum, NotifierTypeEnum } from '@notifications/shared/enums';
import {
  IdentityProviderServiceSymbol,
  IdentityProviderServiceType,
} from '@notifications/shared/services';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { container } from '../_config';
import { EmailTypeEnum } from '../_config/emails.config';
import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';

import { BaseHandler } from './base.handler';

export class InnovationTransferOwnershipCompletedHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_COMPLETED,
  | EmailTypeEnum.INNOVATION_TRANSFER_COMPLETED_TO_ORIGINAL_OWNER
  | EmailTypeEnum.INNOVATION_TRANSFER_CANCELLED_TO_NEW_OWNER
  | EmailTypeEnum.INNOVATION_TRANSFER_DECLINED_TO_ORIGINAL_OWNER,
  Record<string, never>
> {
  private identityProviderService = container.get<IdentityProviderServiceType>(
    IdentityProviderServiceSymbol
  );
  private recipientsService = container.get<RecipientsServiceType>(RecipientsServiceSymbol);

  constructor(
    requestUser: { id: string; identityId: string },
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_COMPLETED],
    domainContext: DomainContextType
  ) {
    super(requestUser, data, domainContext);
  }

  async run(): Promise<this> {
    const innovation = await this.recipientsService.innovationInfoWithOwner(
      this.inputData.innovationId
    );
    const innovationOwnerInfo = await this.identityProviderService.getUserInfo(
      innovation.owner.identityId
    );
    const transfer = await this.recipientsService.innovationTransferInfoWithOwner(
      this.inputData.transferId
    );

    switch (transfer.status) {
      case InnovationTransferStatusEnum.COMPLETED:
        this.emails.push({
          templateId: EmailTypeEnum.INNOVATION_TRANSFER_COMPLETED_TO_ORIGINAL_OWNER,
          to: {
            type: 'identityId',
            value: transfer.owner.identityId,
            displayNameParam: 'innovator_name',
          },
          params: {
            // innovator_name: '', // This will be filled by the email-listener function.
            innovation_name: innovation.name,
            new_innovator_name: innovationOwnerInfo.displayName,
            new_innovator_email: innovationOwnerInfo.email,
          },
        });
        break;

      case InnovationTransferStatusEnum.CANCELED:
        this.emails.push({
          templateId: EmailTypeEnum.INNOVATION_TRANSFER_CANCELLED_TO_NEW_OWNER,
          to: { type: 'email', value: transfer.email },
          params: {
            innovator_name: innovationOwnerInfo.displayName,
            innovation_name: innovation.name,
          },
        });
        break;

      case InnovationTransferStatusEnum.DECLINED:
        const targetUser = await this.identityProviderService.getUserInfoByEmail(transfer.email);
        this.emails.push({
          templateId: EmailTypeEnum.INNOVATION_TRANSFER_DECLINED_TO_ORIGINAL_OWNER,
          to: {
            type: 'identityId',
            value: transfer.owner.identityId,
            displayNameParam: 'innovator_name',
          },
          params: {
            innovator_name: innovationOwnerInfo.displayName,
            new_innovator_name: targetUser?.displayName || 'User',
            innovation_name: innovation.name,
          },
        });
        break;

      default:
        break;
    }

    return this;
  }
}
