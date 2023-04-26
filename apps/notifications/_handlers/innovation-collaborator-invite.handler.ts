import {
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
  NotifierTypeEnum,
} from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import {
  IdentityProviderServiceSymbol,
  IdentityProviderServiceType,
} from '@notifications/shared/services';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { container, EmailTypeEnum, ENV } from '../_config';
import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';

import { BaseHandler } from './base.handler';

export class InnovationCollaboratorInviteHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_COLLABORATOR_INVITE,
  | EmailTypeEnum.INNOVATION_COLLABORATOR_INVITE_TO_EXISTING_USER
  | EmailTypeEnum.INNOVATION_COLLABORATOR_INVITE_TO_NEW_USER,
  { collaboratorId: string }
> {
  private identityProviderService = container.get<IdentityProviderServiceType>(
    IdentityProviderServiceSymbol
  );
  private recipientsService = container.get<RecipientsServiceType>(RecipientsServiceSymbol);

  constructor(
    requestUser: { id: string; identityId: string },
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_COLLABORATOR_INVITE],
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
    const collaborator = await this.recipientsService.innovationCollaboratorInfo(
      this.inputData.innovationCollaboratorId
    );

    if (!collaborator.user) {
      // This means that the user is NOT registered in the service.

      this.emails.push({
        templateId: EmailTypeEnum.INNOVATION_COLLABORATOR_INVITE_TO_NEW_USER,
        to: { type: 'email', value: collaborator.email },
        params: {
          innovator_name: innovationOwnerInfo.displayName,
          innovation_name: innovation.name,
          transfer_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath(`innovations/${this.inputData.innovationId}/collaborations/${collaborator.id}`)
            .buildUrl(),
        },
      });
    } else {
      this.emails.push({
        templateId: EmailTypeEnum.INNOVATION_COLLABORATOR_INVITE_TO_EXISTING_USER,
        to: {
          type: 'identityId',
          value: collaborator.user.identityId,
          displayNameParam: 'display_name',
        },
        params: {
          innovator_name: innovationOwnerInfo.displayName,
          innovation_name: innovation.name,
          transfer_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath(
              `innovator/innovations/${this.inputData.innovationId}/collaborations/${collaborator.id}`
            )
            .buildUrl(),
        },
      });

      this.inApp.push({
        innovationId: this.inputData.innovationId,
        context: {
          type: NotificationContextTypeEnum.INNOVATION,
          detail: NotificationContextDetailEnum.COLLABORATOR_INVITE,
          id: this.inputData.innovationCollaboratorId,
        },
        userRoleIds: [collaborator.user.roleId],
        params: {
          collaboratorId: collaborator.id,
        },
      });
    }

    return this;
  }
}
