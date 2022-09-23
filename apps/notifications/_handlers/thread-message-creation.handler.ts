import {
  EmailNotificationTypeEnum,
  NotifierTypeEnum, NotificationContextTypeEnum, NotificationContextDetailEnum,
  UserTypeEnum
} from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import type { NotifierTemplatesType } from '@notifications/shared/types';

import { container, EmailTypeEnum, ENV } from '../_config';
import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';

import { BaseHandler } from './base.handler';


export class ThreadMessageCreationHandler extends BaseHandler<
  NotifierTypeEnum.THREAD_MESSAGE_CREATION,
  EmailTypeEnum.THREAD_MESSAGE_CREATION_TO_ALL,
  { subject: string, messageId: string }
> {

  private recipientsService = container.get<RecipientsServiceType>(RecipientsServiceSymbol);

  constructor(
    requestUser: { id: string, identityId: string, type: UserTypeEnum },
    data: NotifierTemplatesType[NotifierTypeEnum.THREAD_MESSAGE_CREATION]
  ) {
    super(requestUser, data);
  }


  async run(): Promise<this> {

    const innovation = await this.recipientsService.innovationInfoWithOwner(this.inputData.innovationId);
    const thread = await this.recipientsService.threadInfo(this.inputData.threadId);

    // Fetch all thread intervenients, excluding the request user.
    const threadIntervenientUsers = (await this.recipientsService.threadIntervenientUsers(this.inputData.threadId)).filter(item => item.id !== this.requestUser.id);

    // exclude all assessment users
    const recipients = threadIntervenientUsers.filter(i => i.type !== UserTypeEnum.ASSESSMENT)

    // if thread author is an assessment user and the request user is an innovator, push the author back into the thread
    if (thread.author.type === UserTypeEnum.ASSESSMENT && this.requestUser.type === UserTypeEnum.INNOVATOR) {
      recipients.push({
        id: thread.author.id,
        identityId: thread.author.identityId,
        type: thread.author.type,
        emailNotificationPreferences: thread.author.emailNotificationPreferences,
      })
    }

    // Send emails only to users with email preference INSTANTLY.
    for (const user of recipients.filter(item => this.isEmailPreferenceInstantly(EmailNotificationTypeEnum.COMMENT, item.emailNotificationPreferences))) {
      this.emails.push({
        templateId: EmailTypeEnum.THREAD_MESSAGE_CREATION_TO_ALL,
        to: { type: 'identityId', value: user.identityId, displayNameParam: 'display_name' },
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          innovation_name: innovation.name,
          subject: thread.subject,
          thread_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath(':userBasePath/innovations/:innovationId/threads/:threadId')
            .setPathParams({ userBasePath: this.frontendBaseUrl(innovation.owner.type), innovationId: this.inputData.innovationId, threadId: this.inputData.threadId })
            .buildUrl()
        }
      });
    }

    if (threadIntervenientUsers.length > 0) {
      this.inApp.push({
        innovationId: this.inputData.innovationId,
        context: { type: NotificationContextTypeEnum.THREAD, detail: NotificationContextDetailEnum.THREAD_MESSAGE_CREATION, id: this.inputData.threadId },
        userIds: threadIntervenientUsers.map(item => item.id),
        params: { subject: thread.subject, messageId: this.inputData.messageId }
      });
    }

    return this;

  }

}
