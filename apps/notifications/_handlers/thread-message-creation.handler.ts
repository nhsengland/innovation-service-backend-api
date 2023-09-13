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
import type { RecipientType } from '../_services/recipients.service';
import { BaseHandler } from './base.handler';

export class ThreadMessageCreationHandler extends BaseHandler<
  NotifierTypeEnum.THREAD_MESSAGE_CREATION,
  EmailTypeEnum.THREAD_MESSAGE_CREATION_TO_ALL,
  { subject: string; messageId: string }
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.THREAD_MESSAGE_CREATION],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);
    const thread = await this.recipientsService.threadInfo(this.inputData.threadId);

    // Fetch all thread followers, excluding the request user.
    const threadFollowerRecipients = (
      await this.recipientsService.threadFollowerRecipients(this.inputData.threadId)
    ).filter(item => item.userId !== this.requestUser.id);

    // exclude all assessment users from emails
    const emailRecipients = threadFollowerRecipients.filter(i => i.role !== ServiceRoleEnum.ASSESSMENT);

    // Send emails only to users with email preference INSTANTLY.
    for (const recipient of emailRecipients) {
      this.emails.push({
        templateId: EmailTypeEnum.THREAD_MESSAGE_CREATION_TO_ALL,
        notificationPreferenceType: 'MESSAGE',
        to: recipient,
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          innovation_name: innovation.name,
          subject: thread.subject,
          thread_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath(':userBasePath/innovations/:innovationId/threads/:threadId')
            .setPathParams({
              userBasePath: this.frontendBaseUrl(recipient.role),
              innovationId: this.inputData.innovationId,
              threadId: this.inputData.threadId
            })
            .buildUrl()
        }
      });
    }

    await this.pushInAppNotifications(threadFollowerRecipients, thread);

    return this;
  }

  private async pushInAppNotifications(
    threadIntervenientUsers: RecipientType[],
    thread: { subject: string }
  ): Promise<void> {
    // Review this seems to be the only place where locked users are considered for in-app notifications
    const inAppRecipientsRoleIds = threadIntervenientUsers.filter(item => item.isActive).map(item => item.roleId);

    if (inAppRecipientsRoleIds.length > 0) {
      this.inApp.push({
        innovationId: this.inputData.innovationId,
        context: {
          type: NotificationContextTypeEnum.THREAD,
          detail: NotificationContextDetailEnum.THREAD_MESSAGE_CREATION,
          id: this.inputData.threadId
        },
        userRoleIds: inAppRecipientsRoleIds,
        params: { subject: thread.subject, messageId: this.inputData.messageId }
      });
    }
  }
}
