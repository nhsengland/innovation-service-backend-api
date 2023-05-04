import { container, EmailTypeEnum, ENV } from '../_config';

import {
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
  NotifierTypeEnum,
} from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import {
  IdentityProviderServiceSymbol,
  IdentityProviderServiceType,
  LoggerServiceSymbol,
  LoggerServiceType,
} from '@notifications/shared/services';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';
import { BaseHandler } from './base.handler';

export class InnovationTransferOwnershipExpirationHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_EXPIRATION,
  EmailTypeEnum.INNOVATION_TRANSFER_EXPIRED,
  Record<string, never> // Validate
> {
  private identityProviderService = container.get<IdentityProviderServiceType>(
    IdentityProviderServiceSymbol
  );

  private recipientsService = container.get<RecipientsServiceType>(RecipientsServiceSymbol);
  private logger = container.get<LoggerServiceType>(LoggerServiceSymbol);

  constructor(
    requestUser: { id: string; identityId: string },
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_EXPIRATION],
    domainContext: DomainContextType
  ) {
    super(requestUser, data, domainContext);
  }

  async run(): Promise<this> {
    const innovation = await this.recipientsService.innovationInfoWithOwner(
      this.inputData.innovationId,
      true
    );

    // This should never happen since we include deleted innovations.
    if (!innovation) {
      this.logger.log(
        `InnovationTransferOwnershipExpirationHandler: Innovation not found ${this.inputData.innovationId}`
      );
      return this;
    }

    const targetUser = await this.identityProviderService.getUserInfo(innovation.owner.identityId);

    if (targetUser) {
      this.emails.push({
        templateId: EmailTypeEnum.INNOVATION_TRANSFER_EXPIRED,
        to: { type: 'email', value: targetUser.email },
        params: {
          innovation_name: innovation.name,
          innovation_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath(`/innovator/innovations/${this.inputData.innovationId}/overview`)
            .buildUrl(),
        },
      });

      this.inApp.push({
        innovationId: this.inputData.innovationId,
        context: {
          type: NotificationContextTypeEnum.INNOVATION,
          detail: NotificationContextDetailEnum.TRANSFER_EXPIRED,
          id: this.inputData.transferId,
        },
        userRoleIds: [innovation.owner.userRole.id],
        params: {},
      });
    }

    return this;
  }
}
