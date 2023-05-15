import {
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
  NotifierTypeEnum,
  ServiceRoleEnum
} from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { EmailTypeEnum, ENV } from '../_config';

import { BaseHandler } from './base.handler';

export class ThreadCreationHandler extends BaseHandler<
  NotifierTypeEnum.THREAD_CREATION,
  | EmailTypeEnum.THREAD_CREATION_TO_INNOVATOR_FROM_ASSIGNED_USER
  | EmailTypeEnum.THREAD_CREATION_TO_INNOVATOR_FROM_INNOVATOR
  | EmailTypeEnum.THREAD_CREATION_TO_ASSIGNED_USERS,
  { subject: string; messageId: string }
> {
  constructor(
    requestUser: { id: string; identityId: string },
    data: NotifierTemplatesType[NotifierTypeEnum.THREAD_CREATION],
    domainContext: DomainContextType
  ) {
    super(requestUser, data, domainContext);
  }

  async run(): Promise<this> {
    switch (this.domainContext.currentRole.role) {
      case ServiceRoleEnum.ASSESSMENT:
      case ServiceRoleEnum.ACCESSOR:
      case ServiceRoleEnum.QUALIFYING_ACCESSOR:
        await this.prepareNotificationForInnovationOwnerAndCollaboratorsFromAssignedUser();
        break;

      case ServiceRoleEnum.INNOVATOR: {
        const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);
        const thread = await this.recipientsService.threadInfo(this.inputData.threadId);
        await this.prepareNotificationForAssignedUsers(innovation.name, thread);
        await this.prepareNotificationForOwnerAndCollaboratorsFromInnovator(innovation, thread);
        break;
      }

      default:
        break;
    }

    return this;
  }

  // Private methods.
  private async prepareNotificationForInnovationOwnerAndCollaboratorsFromAssignedUser(): Promise<void> {
    const requestUserInfo = await this.recipientsService.usersIdentityInfo(this.requestUser.identityId);
    const requestUserUnitName =
      this.domainContext.currentRole.role === ServiceRoleEnum.ASSESSMENT
        ? 'needs assessment'
        : this.domainContext?.organisation?.organisationUnit?.name ?? '';

    const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);

    const collaboratorIds = await this.recipientsService.getInnovationActiveCollaborators(this.inputData.innovationId);
    const recipients = await this.recipientsService.getUsersRecipient(
      [innovation.ownerId, ...collaboratorIds],
      ServiceRoleEnum.INNOVATOR
    );

    if (recipients.length) {
      const thread = await this.recipientsService.threadInfo(this.inputData.threadId);

      for (const recipient of recipients) {
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
        userRoleIds: recipients.map(c => c.roleId),
        params: { subject: thread.subject, messageId: this.inputData.messageId }
      });
    }
  }

  private async prepareNotificationForOwnerAndCollaboratorsFromInnovator(
    innovation: { name: string; ownerId: string },
    thread: { id: string; subject: string }
  ): Promise<void> {
    const recipientIds = await this.recipientsService.getInnovationActiveCollaborators(this.inputData.innovationId);

    // Add owner if not the same as the request user.
    if (this.domainContext.id !== innovation.ownerId) {
      recipientIds.push(this.domainContext.id);
    }

    const recipients = (await this.recipientsService.getUsersRecipient(recipientIds, ServiceRoleEnum.INNOVATOR)).filter(
      // filter request user
      r => r.roleId !== this.domainContext.currentRole.id
    );

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

  private async prepareNotificationForAssignedUsers(
    innovationName: string,
    thread: { id: string; subject: string }
  ): Promise<void> {
    const assignedUsers = await this.recipientsService.innovationAssignedRecipients({
      innovationId: this.inputData.innovationId
    });

    // Send emails only to users with email preference INSTANTLY.
    for (const user of assignedUsers) {
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

    if (assignedUsers.length) {
      this.inApp.push({
        innovationId: this.inputData.innovationId,
        context: {
          type: NotificationContextTypeEnum.THREAD,
          detail: NotificationContextDetailEnum.THREAD_CREATION,
          id: this.inputData.threadId
        },
        userRoleIds: assignedUsers.map(item => item.roleId),
        params: { subject: thread.subject, messageId: this.inputData.messageId }
      });
    }
  }
}
