import {
  EmailNotificationPreferenceEnum,
  EmailNotificationTypeEnum,
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
  NotifierTypeEnum,
  ServiceRoleEnum,
} from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import { DomainServiceSymbol, DomainServiceType } from '@notifications/shared/services';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { container, EmailTypeEnum, ENV } from '../_config';
import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';

import { BaseHandler } from './base.handler';

type EmailNotificationPreferenceTypeAlias = {
  type: EmailNotificationTypeEnum;
  preference: EmailNotificationPreferenceEnum;
};

type ThreadIntervenientUserTypeAlias = {
  id: string;
  identityId: string;
  locked: boolean;
  userRole: { id: string; role: ServiceRoleEnum };
  userType?: ServiceRoleEnum | undefined;
  organisationUnitId?: string | null;
  emailNotificationPreferences: EmailNotificationPreferenceTypeAlias[];
};

type ThreadTypeAlias = {
  id: string;
  subject: string;
  author: {
    id: string;
    identityId: string;
    emailNotificationPreferences: EmailNotificationPreferenceTypeAlias[];
  };
};

export class ThreadMessageCreationHandler extends BaseHandler<
  NotifierTypeEnum.THREAD_MESSAGE_CREATION,
  EmailTypeEnum.THREAD_MESSAGE_CREATION_TO_ALL,
  { subject: string; messageId: string }
> {
  private recipientsService = container.get<RecipientsServiceType>(RecipientsServiceSymbol);
  private domainService = container.get<DomainServiceType>(DomainServiceSymbol);

  constructor(
    requestUser: { id: string; identityId: string },
    data: NotifierTemplatesType[NotifierTypeEnum.THREAD_MESSAGE_CREATION],
    domainContext: DomainContextType
  ) {
    super(requestUser, data, domainContext);
  }

  async run(): Promise<this> {
    const innovation = await this.recipientsService.innovationInfoWithOwner(
      this.inputData.innovationId
    );
    const thread = await this.recipientsService.threadInfo(this.inputData.threadId);

    const owner = {
      id: innovation.owner.id,
      identityId: innovation.owner.identityId,
      userRole: { id: innovation.owner.userRole.id, role: innovation.owner.userRole.role },
      locked: false,
      organisationUnit: null,
      emailNotificationPreferences: innovation.owner.emailNotificationPreferences,
    };

    // Fetch all thread intervenients, excluding the request user.
    const threadIntervenientUsers = (
      await this.domainService.innovations.threadIntervenients(this.inputData.threadId)
    ).filter((item) => item.id !== this.requestUser.id);

    const ownerIncluded = threadIntervenientUsers.find((u) => u.id === owner.id);

    // ensure innovation owner is included when he's not the request user
    if (!ownerIncluded && owner.id !== this.requestUser.id) {
      threadIntervenientUsers.push(owner);
    }

    // exclude all assessment users
    const recipients = threadIntervenientUsers.filter(
      (i) => i.userRole.role !== ServiceRoleEnum.ASSESSMENT
    );

    // if thread author is an assessment user and the request user is an innovator, push the author back into the thread
    if (
      thread.author.userRole?.role === ServiceRoleEnum.ASSESSMENT &&
      this.domainContext.currentRole.role === ServiceRoleEnum.INNOVATOR
    ) {
      recipients.push({
        id: thread.author.id,
        identityId: thread.author.identityId,
        userRole: { id: thread.author.userRole.id, role: thread.author.userRole.role },
        locked: thread.author.locked,
        emailNotificationPreferences: thread.author.emailNotificationPreferences,
        organisationUnit: null,
      });
    }

    // Send emails only to users with email preference INSTANTLY.
    for (const user of recipients.filter(
      (item) =>
        !item.locked &&
        this.isEmailPreferenceInstantly(
          EmailNotificationTypeEnum.MESSAGE,
          item.emailNotificationPreferences
        )
    )) {
      this.emails.push({
        templateId: EmailTypeEnum.THREAD_MESSAGE_CREATION_TO_ALL,
        to: { type: 'identityId', value: user.identityId, displayNameParam: 'display_name' },
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          innovation_name: innovation.name,
          subject: thread.subject,
          thread_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath(':userBasePath/innovations/:innovationId/threads/:threadId')
            .setPathParams({
              userBasePath: this.frontendBaseUrl(user.userRole.role),
              innovationId: this.inputData.innovationId,
              threadId: this.inputData.threadId,
            })
            .buildUrl(),
        },
      });
    }

    await this.pushInAppNotifications(threadIntervenientUsers, thread);

    return this;
  }

  private async pushInAppNotifications(
    threadIntervenientUsers: ThreadIntervenientUserTypeAlias[],
    thread: ThreadTypeAlias
  ): Promise<void> {
    const inAppRecipientsRoleIds = threadIntervenientUsers
      .filter((item) => !item.locked)
      .map((item) => item.userRole.id);

    // Always include collaborators in the notification center recipients
    // Owner should already be included when this function is called
    const collaborators = (
      await this.recipientsService.innovationActiveCollaboratorUsers(this.inputData.innovationId)
    ).filter(
      (item) =>
        item.userRole !== undefined && !inAppRecipientsRoleIds.includes(item.userRole.id)
    ); //filter thread intervenient users

    inAppRecipientsRoleIds.push(...collaborators.map((c) => c.userRole.id));

    if (inAppRecipientsRoleIds.length > 0) {
      this.inApp.push({
        innovationId: this.inputData.innovationId,
        context: {
          type: NotificationContextTypeEnum.THREAD,
          detail: NotificationContextDetailEnum.THREAD_MESSAGE_CREATION,
          id: this.inputData.threadId,
        },
        userRoleIds: inAppRecipientsRoleIds,
        params: { subject: thread.subject, messageId: this.inputData.messageId },
      });
    }
  }
}
