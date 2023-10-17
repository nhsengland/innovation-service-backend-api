import {
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
  NotifierTypeEnum,
  ServiceRoleEnum
} from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { EmailTypeEnum, ENV } from '../../_config';

import type { Context } from '@azure/functions';
import { InnovationErrorsEnum, NotFoundError } from '@notifications/shared/errors';
import { BaseHandler } from '../base.handler';

export class InnovationCollaboratorInviteHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_COLLABORATOR_INVITE,
  | EmailTypeEnum.INNOVATION_COLLABORATOR_INVITE_TO_EXISTING_USER
  | EmailTypeEnum.INNOVATION_COLLABORATOR_INVITE_TO_NEW_USER,
  { collaboratorId: string }
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_COLLABORATOR_INVITE],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);

    // This will never happen since in order to invite a collaborator you have to be an owner
    if (!innovation.ownerIdentityId) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_OWNER_NOT_FOUND);
    }

    const innovationOwnerInfo = await this.recipientsService.usersIdentityInfo(innovation.ownerIdentityId);

    if (!innovationOwnerInfo) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_OWNER_NOT_FOUND);
    }

    const collaborator = await this.recipientsService.innovationCollaborationInfo(
      this.inputData.innovationCollaboratorId
    );

    if (!collaborator.userId) {
      // This means that the user is NOT registered in the service.

      this.emails.push({
        templateId: EmailTypeEnum.INNOVATION_COLLABORATOR_INVITE_TO_NEW_USER,
        to: { email: collaborator.email },
        notificationPreferenceType: null,
        params: {
          innovator_name: innovationOwnerInfo.displayName,
          innovation_name: innovation.name,
          transfer_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath(`innovations/${this.inputData.innovationId}/collaborations/${collaborator.collaboratorId}`)
            .buildUrl()
        }
      });
    } else {
      const recipient = await this.recipientsService.getUsersRecipient(collaborator.userId, ServiceRoleEnum.INNOVATOR);
      if (recipient) {
        this.emails.push({
          templateId: EmailTypeEnum.INNOVATION_COLLABORATOR_INVITE_TO_EXISTING_USER,
          to: recipient,
          notificationPreferenceType: null,
          params: {
            innovator_name: innovationOwnerInfo.displayName,
            innovation_name: innovation.name,
            transfer_url: new UrlModel(ENV.webBaseTransactionalUrl)
              .addPath(
                `innovator/innovations/${this.inputData.innovationId}/collaborations/${collaborator.collaboratorId}`
              )
              .buildUrl()
          }
        });

        this.inApp.push({
          innovationId: this.inputData.innovationId,
          context: {
            type: NotificationContextTypeEnum.INNOVATION,
            detail: NotificationContextDetailEnum.COLLABORATOR_INVITE,
            id: this.inputData.innovationCollaboratorId
          },
          userRoleIds: [recipient.roleId],
          params: {
            collaboratorId: collaborator.collaboratorId
          }
        });
      }
    }

    return this;
  }
}
