import type { UserRoleEntity } from '@notifications/shared/entities';
import {
  EmailNotificationPreferenceEnum,
  EmailNotificationTypeEnum,
  InnovationCollaboratorStatusEnum,
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

type innovatorRecipientType = {
  id: string;
  identityId: string;
  userRole: UserRoleEntity;
  isActive: boolean;
  emailNotificationPreferences: {
    type: EmailNotificationTypeEnum;
    preference: EmailNotificationPreferenceEnum;
  }[];
}

type InnovationTypeAlias = {
  name: string;
  owner: {
    id: string;
    identityId: string;
    userRole: UserRoleEntity;
    emailNotificationPreferences: EmailNotificationPreferenceTypeAlias[];
  };
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

    this.pushInAppNotifications(threadIntervenientUsers, innovation, thread);

    return this;
  }

  private async pushInAppNotifications(
    threadIntervenientUsers: ThreadIntervenientUserTypeAlias[],
    innovation: InnovationTypeAlias,
    thread: ThreadTypeAlias
  ): Promise<void> {

    const inAppRecipients = threadIntervenientUsers
      .filter((item) => !item.locked)
      .map((item) => item.userRole.id);

    const threadIntervenientUserRoleIds = threadIntervenientUsers.map(i => i.userRole.id);

    // Always include Innovation owner and collaborators in the notification center recipients
    const owner = innovation.owner;
    const collaborators = (await this.recipientsService.innovationInfoWithCollaborators(this.inputData.innovationId)).collaborators
      .filter(c => c.status === InnovationCollaboratorStatusEnum.ACTIVE)
      .map(c => c.user)
      .filter((item): item is innovatorRecipientType => item !== undefined && item.userRole !== undefined && !threadIntervenientUserRoleIds.includes(item.userRole.id)) //filter undefined items and thread intervenient users

    // Check is the innovation owner is already part of the recipients list to avoid duplicated notifications
    const ownerIncluded = threadIntervenientUsers.find((i) => i.id === owner.id);

    // In the case the owner is not on the recipients list and the creator of the reply is not the owner her/himself
    // Add her/him to the recipients list of in app notifications
    if (!ownerIncluded && owner.id !== this.requestUser.id) {
      inAppRecipients.push(owner.userRole.id);
    }

    inAppRecipients.push(...collaborators.map(c => c.userRole.id))

    if (inAppRecipients.length > 0) {
      this.inApp.push({
        innovationId: this.inputData.innovationId,
        context: {
          type: NotificationContextTypeEnum.THREAD,
          detail: NotificationContextDetailEnum.THREAD_MESSAGE_CREATION,
          id: this.inputData.threadId,
        },
        userRoleIds: inAppRecipients,
        params: { subject: thread.subject, messageId: this.inputData.messageId },
      });
    }
  }
}
