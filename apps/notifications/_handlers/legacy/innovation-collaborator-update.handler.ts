import {
  InnovationCollaboratorStatusEnum,
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
  NotifierTypeEnum,
  ServiceRoleEnum
} from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { ENV } from '../../_config';

import type { Context } from '@azure/functions';
import { EmailErrorsEnum, InnovationErrorsEnum, NotFoundError, UserErrorsEnum } from '@notifications/shared/errors';
import { UrlModel } from '@notifications/shared/models';
import type { RecipientType, RecipientsService } from '../../_services/recipients.service';
import { BaseHandler } from '../base.handler';

export class InnovationCollaboratorUpdateHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_COLLABORATOR_UPDATE,
  'MIGRATION_OLD'
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_COLLABORATOR_UPDATE],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);
    const owner = await this.recipientsService.getUsersRecipient(innovation.ownerId, ServiceRoleEnum.INNOVATOR);
    const innovationCollaborator = await this.recipientsService.innovationCollaborationInfo(
      this.inputData.innovationCollaborator.id
    );

    if (
      [
        InnovationCollaboratorStatusEnum.ACTIVE,
        InnovationCollaboratorStatusEnum.DECLINED,
        InnovationCollaboratorStatusEnum.LEFT
      ].includes(this.inputData.innovationCollaborator.status) &&
      owner
    ) {
      await this.prepareNotificationToOwner(innovation, innovationCollaborator, owner);
    }

    if (
      [
        InnovationCollaboratorStatusEnum.CANCELLED,
        InnovationCollaboratorStatusEnum.REMOVED,
        InnovationCollaboratorStatusEnum.LEFT
      ].includes(this.inputData.innovationCollaborator.status)
    ) {
      await this.prepareNotificationToCollaborator(innovation, innovationCollaborator);
    }

    if ([InnovationCollaboratorStatusEnum.LEFT].includes(this.inputData.innovationCollaborator.status)) {
      await this.prepareNotificationToOtherCollaborators(innovation);
    }

    return this;
  }

  async prepareNotificationToOwner(
    innovation: Awaited<ReturnType<RecipientsService['innovationInfo']>>,
    innovationCollaborator: Awaited<ReturnType<RecipientsService['innovationCollaborationInfo']>>,
    innovationOwner?: RecipientType
  ): Promise<void> {
    if (!innovationOwner) {
      this.logger(`Innovation owner not found for ${innovation.name}`);
      return;
    }

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

    let templateId:
      | 'INNOVATION_COLLABORATOR_INVITE_ACCEPTED_TO_OWNER'
      | 'INNOVATION_COLLABORATOR_INVITE_DECLINED_TO_OWNER'
      | 'INNOVATION_COLLABORATOR_LEAVES_TO_OWNER';
    let innovationUrl: string | undefined;

    switch (this.inputData.innovationCollaborator.status) {
      case InnovationCollaboratorStatusEnum.ACTIVE:
        templateId = 'INNOVATION_COLLABORATOR_INVITE_ACCEPTED_TO_OWNER';
        innovationUrl = new UrlModel(ENV.webBaseTransactionalUrl)
          .addPath('innovator/innovations/:innovationId/manage/innovation/collaborators')
          .setPathParams({ innovationId: this.inputData.innovationId })
          .buildUrl();
        break;
      case InnovationCollaboratorStatusEnum.DECLINED:
        templateId = 'INNOVATION_COLLABORATOR_INVITE_DECLINED_TO_OWNER';
        break;
      case InnovationCollaboratorStatusEnum.LEFT:
        templateId = 'INNOVATION_COLLABORATOR_LEAVES_TO_OWNER';
        innovationUrl = new UrlModel(ENV.webBaseTransactionalUrl)
          .addPath('innovator/innovations/:innovationId')
          .setPathParams({ innovationId: this.inputData.innovationId })
          .buildUrl();
        break;
      default:
        throw new NotFoundError(EmailErrorsEnum.EMAIL_TEMPLATE_NOT_FOUND);
    }

    this.emails.push({
      templateId,
      to: innovationOwner,
      notificationPreferenceType: null,
      params: {
        collaborator_name: collaboratorInfo.displayName,
        innovation_name: innovation.name,
        ...(innovationUrl && { innovation_url: innovationUrl })
      }
    });
  }

  async prepareNotificationToCollaborator(
    innovation: Awaited<ReturnType<RecipientsService['innovationInfo']>>,
    innovationCollaborator: Awaited<ReturnType<RecipientsService['innovationCollaborationInfo']>>
  ): Promise<void> {
    const ownerInfo = await this.recipientsService.usersIdentityInfo(innovation.ownerIdentityId);

    let templateId:
      | 'INNOVATION_COLLABORATOR_INVITE_CANCELLED_TO_COLLABORATOR'
      | 'INNOVATION_COLLABORATOR_REMOVED_TO_COLLABORATOR'
      | 'INNOVATION_COLLABORATOR_LEAVES_TO_COLLABORATOR';

    switch (this.inputData.innovationCollaborator.status) {
      case InnovationCollaboratorStatusEnum.CANCELLED:
        templateId = 'INNOVATION_COLLABORATOR_INVITE_CANCELLED_TO_COLLABORATOR';
        break;
      case InnovationCollaboratorStatusEnum.REMOVED:
        templateId = 'INNOVATION_COLLABORATOR_REMOVED_TO_COLLABORATOR';
        break;
      case InnovationCollaboratorStatusEnum.LEFT:
        templateId = 'INNOVATION_COLLABORATOR_LEAVES_TO_COLLABORATOR';
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
          innovator_name: ownerInfo?.displayName ?? 'user ', //Review what should happen if the owner is not found
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
            id: this.inputData.innovationId
          },
          userRoleIds: [recipient.roleId],
          params: {
            collaboratorId: innovationCollaborator.collaboratorId
          }
        });
      }
    }
  }

  async prepareNotificationToOtherCollaborators(
    innovation: Awaited<ReturnType<RecipientsService['innovationInfo']>>
  ): Promise<void> {
    const collaboratorIds = await this.recipientsService.getInnovationActiveCollaborators(this.inputData.innovationId);
    const collaboratorInfo = await this.recipientsService.usersIdentityInfo(this.requestUser.identityId);

    let templateId: 'INNOVATION_COLLABORATOR_LEAVES_TO_OTHER_COLLABORATORS';

    switch (this.inputData.innovationCollaborator.status) {
      case InnovationCollaboratorStatusEnum.LEFT:
        templateId = 'INNOVATION_COLLABORATOR_LEAVES_TO_OTHER_COLLABORATORS';
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
