import {
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
  NotifierTypeEnum,
  ServiceRoleEnum
} from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { EmailTypeEnum, ENV } from '../_config';

import type { Context } from '@azure/functions';
import { BaseHandler } from './base.handler';
import type { RecipientType } from '../_services/recipients.service';

export class ThreadCreationHandler extends BaseHandler<
  NotifierTypeEnum.THREAD_CREATION,
  | EmailTypeEnum.THREAD_CREATION_TO_INNOVATOR_FROM_ASSIGNED_USER
  | EmailTypeEnum.THREAD_CREATION_TO_INNOVATOR_FROM_INNOVATOR
  | EmailTypeEnum.THREAD_CREATION_TO_ASSIGNED_USERS,
  { subject: string; messageId: string }
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.THREAD_CREATION],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);
    const thread = await this.recipientsService.threadInfo(this.inputData.threadId);

    const collaboratorIds = await this.recipientsService.getInnovationActiveCollaborators(this.inputData.innovationId);

    const recipientIds = collaboratorIds;
    if (innovation.ownerId) {
      recipientIds.push(innovation.ownerId);
    }
    const innovatorRecipients = await this.recipientsService.getUsersRecipient(recipientIds, ServiceRoleEnum.INNOVATOR);

    switch (this.requestUser.currentRole.role) {
      case ServiceRoleEnum.ASSESSMENT:
      case ServiceRoleEnum.ACCESSOR:
      case ServiceRoleEnum.QUALIFYING_ACCESSOR:
        await this.prepareNotificationForInnovationOwnerAndCollaboratorsFromAssignedUser(innovatorRecipients);
        await this.prepareNotificationForFollowers(innovation.name, innovatorRecipients, thread);
        break;

      case ServiceRoleEnum.INNOVATOR: {
        await this.prepareNotificationForOwnerAndCollaboratorsFromInnovator(innovation, thread, innovatorRecipients);
        await this.prepareNotificationForFollowers(innovation.name, innovatorRecipients, thread);
        break;
      }

      default:
        break;
    }

    return this;
  }

  // Private methods.
  private async prepareNotificationForInnovationOwnerAndCollaboratorsFromAssignedUser(
    innovatorRecipients: RecipientType[]
  ): Promise<void> {
    const requestUserInfo = await this.recipientsService.usersIdentityInfo(this.requestUser.identityId);
    const requestUserUnitName =
      this.requestUser.currentRole.role === ServiceRoleEnum.ASSESSMENT
        ? 'needs assessment'
        : this.requestUser?.organisation?.organisationUnit?.name ?? '';

    if (innovatorRecipients.length) {
      const thread = await this.recipientsService.threadInfo(this.inputData.threadId);

      for (const recipient of innovatorRecipients) {
        this.emails.push({
          templateId: EmailTypeEnum.THREAD_CREATION_TO_INNOVATOR_FROM_ASSIGNED_USER,
          notificationPreferenceType: 'MESSAGE',
          to: recipient,
          params: {
            // display_name: '', // This will be filled by the email-listener function.
            accessor_name: requestUserInfo?.displayName ?? 'user', //Review what should happen if user is not found
            unit_name: requestUserUnitName,
            thread_url: new UrlModel(ENV.webBaseTransactionalUrl)
              .addPath(':userBasePath/innovations/:innovationId/threads/:threadId')
              .setPathParams({
                userBasePath: this.frontendBaseUrl(ServiceRoleEnum.INNOVATOR),
                innovationId: this.inputData.innovationId,
                threadId: this.inputData.threadId
              })
              .buildUrl()
          }
        });
      }

      this.inApp.push({
        innovationId: this.inputData.innovationId,
        context: {
          type: NotificationContextTypeEnum.THREAD,
          detail: NotificationContextDetailEnum.THREAD_CREATION,
          id: this.inputData.threadId
        },
        userRoleIds: innovatorRecipients.map(c => c.roleId),
        params: { subject: thread.subject, messageId: this.inputData.messageId }
      });
    }
  }

  private async prepareNotificationForOwnerAndCollaboratorsFromInnovator(
    innovation: { name: string; ownerId?: string },
    thread: { id: string; subject: string },
    innovatorRecipients: RecipientType[]
  ): Promise<void> {
    // filter request user
    const recipients = innovatorRecipients.filter(r => r.roleId !== this.requestUser.currentRole.id);

    for (const recipient of recipients) {
      this.emails.push({
        templateId: EmailTypeEnum.THREAD_CREATION_TO_INNOVATOR_FROM_INNOVATOR,
        notificationPreferenceType: 'MESSAGE',
        to: recipient,
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          subject: thread.subject,
          innovation_name: innovation.name,
          thread_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath(':userBasePath/innovations/:innovationId/threads/:threadId')
            .setPathParams({
              userBasePath: this.frontendBaseUrl(ServiceRoleEnum.INNOVATOR),
              innovationId: this.inputData.innovationId,
              threadId: this.inputData.threadId
            })
            .buildUrl()
        }
      });
    }

    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: {
        type: NotificationContextTypeEnum.THREAD,
        detail: NotificationContextDetailEnum.THREAD_CREATION,
        id: this.inputData.threadId
      },
      userRoleIds: recipients.map(r => r.roleId),
      params: { subject: thread.subject, messageId: this.inputData.messageId }
    });
  }

  private async prepareNotificationForFollowers(
    innovationName: string,
    innovatorRecipients: RecipientType[],
    thread: { id: string; subject: string }
  ): Promise<void> {
    //remove innovators
    const followers = (await this.recipientsService.threadFollowerRecipients(this.inputData.threadId)).filter(
      follower => !innovatorRecipients.some(recipient => recipient.roleId === follower.roleId) && follower.isActive
    );

    // Send emails only to users with email preference INSTANTLY.
    for (const user of followers) {
      this.emails.push({
        templateId: EmailTypeEnum.THREAD_CREATION_TO_ASSIGNED_USERS,
        notificationPreferenceType: 'MESSAGE',
        to: user,
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          innovation_name: innovationName,
          thread_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath(':userBasePath/innovations/:innovationId/threads/:threadId')
            .setPathParams({
              userBasePath: this.frontendBaseUrl(user.role),
              innovationId: this.inputData.innovationId,
              threadId: this.inputData.threadId
            })
            .buildUrl()
        }
      });
    }

    if (followers.length) {
      this.inApp.push({
        innovationId: this.inputData.innovationId,
        context: {
          type: NotificationContextTypeEnum.THREAD,
          detail: NotificationContextDetailEnum.THREAD_CREATION,
          id: this.inputData.threadId
        },
        userRoleIds: followers.map(item => item.roleId),
        params: { subject: thread.subject, messageId: this.inputData.messageId }
      });
    }
  }
}
