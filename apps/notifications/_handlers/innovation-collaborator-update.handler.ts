import {
  InnovationCollaboratorStatusEnum,
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
  NotifierTypeEnum,
  ServiceRoleEnum
} from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { EmailTypeEnum, ENV } from '../_config';

import { EmailErrorsEnum, InnovationErrorsEnum, NotFoundError, UserErrorsEnum } from '@notifications/shared/errors';
import { UrlModel } from '@notifications/shared/models';
import type { RecipientType } from '../_services/recipients.service';
import { BaseHandler } from './base.handler';
import type { Context } from '@azure/functions';

export class InnovationCollaboratorUpdateHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_COLLABORATOR_UPDATE,
  | EmailTypeEnum.INNOVATION_COLLABORATOR_INVITE_ACCEPTED_TO_OWNER
  | EmailTypeEnum.INNOVATION_COLLABORATOR_INVITE_DECLINED_TO_OWNER
  | EmailTypeEnum.INNOVATION_COLLABORATOR_INVITE_CANCELLED_TO_COLLABORATOR
  | EmailTypeEnum.INNOVATION_COLLABORATOR_INVITE_CANCELLED_TO_COLLABORATOR
  | EmailTypeEnum.INNOVATION_COLLABORATOR_REMOVED_TO_COLLABORATOR
  | EmailTypeEnum.INNOVATION_COLLABORATOR_LEAVES_TO_COLLABORATOR
  | EmailTypeEnum.INNOVATION_COLLABORATOR_LEAVES_TO_OTHER_COLLABORATORS,
  { collaboratorId: string }
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_COLLABORATOR_UPDATE],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    if (
      [
        InnovationCollaboratorStatusEnum.ACTIVE,
        InnovationCollaboratorStatusEnum.DECLINED,
        InnovationCollaboratorStatusEnum.LEFT
      ].includes(this.inputData.innovationCollaborator.status)
    ) {
      await this.prepareNotificationToOwner();
    }

    if (
      [
        InnovationCollaboratorStatusEnum.CANCELLED,
        InnovationCollaboratorStatusEnum.REMOVED,
        InnovationCollaboratorStatusEnum.LEFT
      ].includes(this.inputData.innovationCollaborator.status)
    ) {
      await this.prepareNotificationToCollaborator();
    }

    if ([InnovationCollaboratorStatusEnum.LEFT].includes(this.inputData.innovationCollaborator.status)) {
      await this.prepareNotificationToOtherCollaborators();
    }

    return this;
  }

  async prepareNotificationToOwner(): Promise<void> {
    const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);
    const owner = await this.recipientsService.getUsersRecipient(innovation.ownerId, ServiceRoleEnum.INNOVATOR);
    if (!owner) {
      this.logger(`Innovation owner not found for ${innovation.name}`);
      return;
    }
    const innovationCollaborator = await this.recipientsService.innovationCollaborationInfo(
      this.inputData.innovationCollaborator.id
    );

    if (!innovationCollaborator?.userId) {
      // this should never happen because the users must be registered to update the innovation collaborator status
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_COLLABORATOR_MUST_BE_INNOVATOR);
    }

    const collaboratorIdentity = await this.recipientsService.userId2IdentityId(innovationCollaborator.userId);
    const collaboratorInfo = collaboratorIdentity
      ? await this.recipientsService.usersIdentityInfo(collaboratorIdentity)
      : null;

    if (!collaboratorInfo) {
      throw new NotFoundError(UserErrorsEnum.USER_IDENTITY_PROVIDER_NOT_FOUND);
    }

    let templateId: EmailTypeEnum;

    switch (this.inputData.innovationCollaborator.status) {
      case InnovationCollaboratorStatusEnum.ACTIVE:
        templateId = EmailTypeEnum.INNOVATION_COLLABORATOR_INVITE_ACCEPTED_TO_OWNER;
        break;
      case InnovationCollaboratorStatusEnum.DECLINED:
        templateId = EmailTypeEnum.INNOVATION_COLLABORATOR_INVITE_DECLINED_TO_OWNER;
        break;
      case InnovationCollaboratorStatusEnum.LEFT:
        templateId = EmailTypeEnum.INNOVATION_COLLABORATOR_LEAVES_TO_OWNER;
        break;
      default:
        throw new NotFoundError(EmailErrorsEnum.EMAIL_TEMPLATE_NOT_FOUND);
    }

    this.emails.push({
      templateId,
      to: owner,
      notificationPreferenceType: null,
      params: {
        collaborator_name: collaboratorInfo.displayName,
        innovation_name: innovation.name,
        ...(this.inputData.innovationCollaborator.status === InnovationCollaboratorStatusEnum.LEFT
          ? {
              innovation_url: new UrlModel(ENV.webBaseTransactionalUrl)
                .addPath('innovator/innovations/:innovationId')
                .setPathParams({ innovationId: this.inputData.innovationId })
                .buildUrl()
            }
          : {})
      }
    });
  }

  async prepareNotificationToCollaborator(): Promise<void> {
    const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);
    const innovationOwnerInfo = await this.recipientsService.usersIdentityInfo(innovation.ownerIdentityId);
    const innovationCollaborator = await this.recipientsService.innovationCollaborationInfo(
      this.inputData.innovationCollaborator.id
    );

    let templateId: EmailTypeEnum;

    switch (this.inputData.innovationCollaborator.status) {
      case InnovationCollaboratorStatusEnum.CANCELLED:
        templateId = EmailTypeEnum.INNOVATION_COLLABORATOR_INVITE_CANCELLED_TO_COLLABORATOR;
        break;
      case InnovationCollaboratorStatusEnum.REMOVED:
        templateId = EmailTypeEnum.INNOVATION_COLLABORATOR_REMOVED_TO_COLLABORATOR;
        break;
      case InnovationCollaboratorStatusEnum.LEFT:
        templateId = EmailTypeEnum.INNOVATION_COLLABORATOR_LEAVES_TO_COLLABORATOR;
        break;
      default:
        throw new NotFoundError(EmailErrorsEnum.EMAIL_TEMPLATE_NOT_FOUND);
    }

    let recipient: { email: string } | RecipientType | null = null;

    if (innovationCollaborator.userId) {
      recipient = await this.recipientsService.getUsersRecipient(
        innovationCollaborator.userId,
        ServiceRoleEnum.INNOVATOR
      );
    } else {
      recipient = { email: innovationCollaborator.email };
    }

    if (recipient) {
      this.emails.push({
        to: recipient,
        notificationPreferenceType: null,
        templateId,
        params: {
          innovator_name: innovationOwnerInfo?.displayName ?? 'user ', //Review what should happen if the owner is not found
          innovation_name: innovation.name
        }
      });
    }

    if (this.inputData.innovationCollaborator.status === InnovationCollaboratorStatusEnum.CANCELLED) {
      if (recipient && 'roleId' in recipient) {
        // user exists in the service
        this.inApp.push({
          innovationId: this.inputData.innovationId,
          context: {
            type: NotificationContextTypeEnum.INNOVATION,
            detail: NotificationContextDetailEnum.COLLABORATOR_UPDATE,
            id: this.inputData.innovationCollaborator.id
          },
          userRoleIds: [recipient.roleId],
          params: {
            collaboratorId: innovationCollaborator.collaboratorId
          }
        });
      }
    }
  }

  async prepareNotificationToOtherCollaborators(): Promise<void> {
    const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);
    const collaboratorIds = await this.recipientsService.getInnovationActiveCollaborators(this.inputData.innovationId);
    const collaboratorInfo = await this.recipientsService.usersIdentityInfo(this.requestUser.identityId);

    let templateId: EmailTypeEnum;

    switch (this.inputData.innovationCollaborator.status) {
      case InnovationCollaboratorStatusEnum.LEFT:
        templateId = EmailTypeEnum.INNOVATION_COLLABORATOR_LEAVES_TO_OTHER_COLLABORATORS;
        break;
      default:
        throw new NotFoundError(EmailErrorsEnum.EMAIL_TEMPLATE_NOT_FOUND);
    }

    const collaborators = await this.recipientsService.getUsersRecipient(collaboratorIds, ServiceRoleEnum.INNOVATOR);

    for (const collaborator of collaborators) {
      this.emails.push({
        to: collaborator,
        notificationPreferenceType: null,
        templateId,
        params: {
          collaborator_name: collaboratorInfo?.displayName ?? 'user ', //Review what should happen if user is not found
          innovation_name: innovation.name,
          ...(this.inputData.innovationCollaborator.status === InnovationCollaboratorStatusEnum.LEFT
            ? {
                innovation_url: new UrlModel(ENV.webBaseTransactionalUrl)
                  .addPath('innovator/innovations/:innovationId')
                  .setPathParams({ innovationId: this.inputData.innovationId })
                  .buildUrl()
              }
            : {})
        }
      });
    }
  }
}
