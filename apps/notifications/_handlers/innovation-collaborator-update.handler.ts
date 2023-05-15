import {
  InnovationCollaboratorStatusEnum,
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
  NotifierTypeEnum,
  ServiceRoleEnum
} from '@notifications/shared/enums';
import { LoggerServiceSymbol, LoggerServiceType } from '@notifications/shared/services';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { container, EmailTypeEnum, ENV } from '../_config';

import { EmailErrorsEnum, NotFoundError, UserErrorsEnum } from '@notifications/shared/errors';
import { UrlModel } from '@notifications/shared/models';
import type { RecipientType } from '../_services/recipients.service';
import { BaseHandler } from './base.handler';

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
  private logger = container.get<LoggerServiceType>(LoggerServiceSymbol);

  constructor(
    requestUser: { id: string; identityId: string },
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_COLLABORATOR_UPDATE],
    domainContext: DomainContextType
  ) {
    super(requestUser, data, domainContext);
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
      this.logger.log(`Innovation owner not found for ${innovation.name}`);
      return;
    }
    const innovationCollaborator = await this.recipientsService.innovationCollaborationInfo(
      this.inputData.innovationCollaborator.id
    );
    const collaboratorInfo = await this.recipientsService.usersIdentityInfo(innovationCollaborator.email);

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
    const collaboratorInfo = await this.recipientsService.usersIdentityInfo(this.domainContext.identityId);

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
