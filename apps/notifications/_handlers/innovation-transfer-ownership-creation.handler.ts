import {
  IdentityProviderServiceSymbol,
  IdentityProviderServiceType,
} from '@notifications/shared/services';
import type { NotifierTypeEnum } from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { container, EmailTypeEnum, ENV } from '../_config';
import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';

import { BaseHandler } from './base.handler';

export class InnovationTransferOwnershipCreationHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_CREATION,
  | EmailTypeEnum.INNOVATION_TRANSFER_TO_NEW_USER
  | EmailTypeEnum.INNOVATION_TRANSFER_TO_EXISTING_USER,
  Record<string, never>
> {
  private identityProviderService = container.get<IdentityProviderServiceType>(
    IdentityProviderServiceSymbol
  );
  private recipientsService = container.get<RecipientsServiceType>(RecipientsServiceSymbol);

  constructor(
    requestUser: { id: string; identityId: string },
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_CREATION],
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

    const targetUser = await this.identityProviderService.getUserInfoByEmail(transfer.email);

    if (!targetUser) {
      // This means that the user is NOT registered in the service.

      this.emails.push({
        templateId: EmailTypeEnum.INNOVATION_TRANSFER_TO_NEW_USER,
        to: { type: 'email', value: transfer.email },
        params: {
          innovator_name: innovationOwnerInfo.displayName,
          innovation_name: innovation.name,
          transfer_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath(`transfers/${transfer.id}`)
            .buildUrl(),
        },
      });
    } else {
      this.emails.push({
        templateId: EmailTypeEnum.INNOVATION_TRANSFER_TO_EXISTING_USER,
        to: { type: 'identityId', value: targetUser.identityId },
        params: {
          innovator_name: innovationOwnerInfo.displayName,
          innovation_name: innovation.name,
          transfer_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('innovator/dashboard')
            .buildUrl(),
        },
      });
    }

    return this;
  }
}
