import { NotifierTypeEnum, NotificationContextTypeEnum, NotificationContextDetailEnum, UserTypeEnum, EmailNotificationTypeEnum } from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import { DomainServiceSymbol, DomainServiceType } from '@notifications/shared/services';
import type { NotifierTemplatesType } from '@notifications/shared/types';

import { container, EmailTypeEnum, ENV } from '../_config';
import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';

import { BaseHandler } from './base.handler';


export class ThreadCreationHandler extends BaseHandler<
  NotifierTypeEnum.THREAD_CREATION,
  EmailTypeEnum.THREAD_CREATION_TO_INNOVATOR | EmailTypeEnum.THREAD_CREATION_TO_ASSIGNED_USERS,
  { subject: string, messageId: string }
> {

  private domainService = container.get<DomainServiceType>(DomainServiceSymbol);
  private recipientsService = container.get<RecipientsServiceType>(RecipientsServiceSymbol);

  constructor(
    requestUser: { id: string, identityId: string, type: UserTypeEnum },
    data: NotifierTemplatesType[NotifierTypeEnum.THREAD_CREATION]
  ) {
    super(requestUser, data);
  }


  async run(): Promise<this> {

    switch (this.requestUser.type) {
      case UserTypeEnum.ASSESSMENT:
      case UserTypeEnum.ACCESSOR:
        await this.prepareNotificationForInnovator();
        break;

      case UserTypeEnum.INNOVATOR:
        await this.prepareNotificationForAssignedUsers();
        break;

      default:
        break;
    }

    return this;

  }


  // Private methods.

  private async prepareNotificationForInnovator(): Promise<void> {

    const requestUserInfo = await this.domainService.users.getUserInfo({ userId: this.requestUser.id });
    const requestUserUnitName = requestUserInfo.type === UserTypeEnum.ASSESSMENT ? 'needs assessment' : requestUserInfo.organisations[0]?.organisationUnits[0]?.name ?? '';

    const innovation = await this.recipientsService.innovationInfoWithOwner(this.inputData.innovationId);
    const thread = await this.recipientsService.threadInfo(this.inputData.threadId);

    // Send email only to user if email preference INSTANTLY.
    if (this.isEmailPreferenceInstantly(EmailNotificationTypeEnum.COMMENT, innovation.owner.emailNotificationPreferences)) {
      this.emails.push({
        templateId: EmailTypeEnum.THREAD_CREATION_TO_INNOVATOR,
        to: { type: 'identityId', value: innovation.owner.identityId, displayNameParam: 'display_name' },
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          accessor_name: requestUserInfo.displayName,
          unit_name: requestUserUnitName,
          thread_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath(':userBasePath/innovations/:innovationId/threads/:threadId')
            .setPathParams({ userBasePath: this.frontendBaseUrl(innovation.owner.type), innovationId: this.inputData.innovationId, threadId: this.inputData.threadId })
            .buildUrl()
        }
      });
    }

    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: { type: NotificationContextTypeEnum.THREAD, detail: NotificationContextDetailEnum.THREAD_CREATION, id: this.inputData.threadId },
      userIds: [innovation.owner.id],
      params: { subject: thread.subject, messageId: this.inputData.messageId }
    });

  }

  private async prepareNotificationForAssignedUsers(): Promise<void> {

    const innovation = await this.recipientsService.innovationInfoWithOwner(this.inputData.innovationId);
    const thread = await this.recipientsService.threadInfo(this.inputData.threadId);
    const assignedUsers = await this.recipientsService.innovationAssignedUsers({ innovationId: this.inputData.innovationId });

    // Send emails only to users with email preference INSTANTLY.
    for (const user of assignedUsers.filter(item => this.isEmailPreferenceInstantly(EmailNotificationTypeEnum.COMMENT, item.emailNotificationPreferences))) {
      this.emails.push({
        templateId: EmailTypeEnum.THREAD_CREATION_TO_ASSIGNED_USERS,
        to: { type: 'identityId', value: user.identityId, displayNameParam: 'display_name' },
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          innovation_name: innovation.name,
          thread_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath(':userBasePath/innovations/:innovationId/threads/:threadId')
            .setPathParams({ userBasePath: this.frontendBaseUrl(innovation.owner.type), innovationId: this.inputData.innovationId, threadId: this.inputData.threadId })
            .buildUrl()
        }
      });
    }

    if (assignedUsers.length > 0) {
      this.inApp.push({
        innovationId: this.inputData.innovationId,
        context: { type: NotificationContextTypeEnum.THREAD, detail: NotificationContextDetailEnum.THREAD_CREATION, id: this.inputData.threadId },
        userIds: assignedUsers.map(item => item.id),
        params: { subject: thread.subject, messageId: this.inputData.messageId }
      });
    }

  }

}
