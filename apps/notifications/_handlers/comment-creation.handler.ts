import {
  EmailNotificationPreferenceEnum, EmailNotificationTypeEnum,
  NotifierTypeEnum, NotificationContextTypeEnum, NotificationContextDetailEnum,
  UserTypeEnum
} from '@notifications/shared/enums';
import { DomainServiceSymbol, DomainServiceType } from '@notifications/shared/services';
import type { NotifierTemplatesType } from '@notifications/shared/types';

import { container, EmailTypeEnum, ENV } from '../_config';
import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';

import { BaseHandler } from './base.handler';


export class CommentCreationHandler extends BaseHandler<
  NotifierTypeEnum.COMMENT_CREATION,
  EmailTypeEnum.COMMENT_CREATION_TO_INNOVATOR | EmailTypeEnum.COMMENT_CREATION_TO_ASSIGNED_USERS | EmailTypeEnum.COMMENT_REPLY_TO_ALL,
  Record<string, never>
> {

  private domainService = container.get<DomainServiceType>(DomainServiceSymbol);
  private recipientsService = container.get<RecipientsServiceType>(RecipientsServiceSymbol);

  private data: {
    innovation?: { name: string, owner: { id: string, identityId: string, type: UserTypeEnum, emailNotificationPreferences: { type: EmailNotificationTypeEnum, preference: EmailNotificationPreferenceEnum }[] } },
    commentIntervenientUsers: { id: string, identityId: string, type: UserTypeEnum }[]
  } = {
      commentIntervenientUsers: []
    };


  constructor(
    requestUser: { id: string, identityId: string, type: UserTypeEnum },
    data: NotifierTemplatesType[NotifierTypeEnum.COMMENT_CREATION]
  ) {
    super(requestUser, data);
  }


  async run(): Promise<this> {

    this.data.innovation = await this.recipientsService.innovationInfoWithOwner(this.inputData.innovationId);

    if (this.inputData.replyToId) {

      await this.prepareNotificationForCommentIntervenients();

    } else {

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

    }

    return this;

  }


  // Private methods.


  private async prepareNotificationForCommentIntervenients(): Promise<void> {

    // Fetch all comment intervenients, excluding the request user.
    const commentIntervenientUsers = (await this.recipientsService.commentIntervenientUsers(this.inputData.replyToId || '')).filter(item => item.id !== this.requestUser.id);

    // Send emails only to users with email preference INSTANTLY.
    for (const user of commentIntervenientUsers.filter(item => this.isEmailPreferenceInstantly(EmailNotificationTypeEnum.COMMENT, item.emailNotificationPreferences))) {
      this.emails.push({
        templateId: EmailTypeEnum.COMMENT_REPLY_TO_ALL,
        to: { type: 'identityId', value: user.identityId, displayNameParam: 'display_name' },
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          innovation_name: this.data.innovation?.name || '',
          comment_url: new URL(`${this.frontendBaseUrl(user.type)}/innovations/${this.inputData.innovationId}/comments`, ENV.webBaseTransactionalUrl).toString()
        }
      });
    }

    if (commentIntervenientUsers.length > 0) {
      this.inApp.push({
        innovationId: this.inputData.innovationId,
        context: { type: NotificationContextTypeEnum.COMMENT, detail: NotificationContextDetailEnum.COMMENT_REPLY, id: this.inputData.commentId },
        userIds: commentIntervenientUsers.map(item => item.id),
        params: {}
      });
    }

  }

  private async prepareNotificationForInnovator(): Promise<void> {

    const requestInfo = await this.domainService.users.getUserInfo({ userId: this.requestUser.id });
    const unitName = requestInfo.type === UserTypeEnum.ASSESSMENT ? 'needs assessment' : requestInfo.organisations[0]?.organisationUnits[0]?.name ?? '';

    // Send email only to user if email preference INSTANTLY.
    if (this.isEmailPreferenceInstantly(EmailNotificationTypeEnum.COMMENT, this.data.innovation?.owner.emailNotificationPreferences || [])) {
      this.emails.push({
        templateId: EmailTypeEnum.COMMENT_CREATION_TO_INNOVATOR,
        to: { type: 'identityId', value: this.data.innovation?.owner.identityId || '', displayNameParam: 'display_name' },
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          accessor_name: requestInfo.displayName,
          unit_name: unitName,
          comment_url: new URL(`${this.frontendBaseUrl(this.data.innovation?.owner.type || UserTypeEnum.INNOVATOR)}/innovations/${this.inputData.innovationId}/comments`, ENV.webBaseTransactionalUrl).toString()
        }
      });
    }

    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: { type: NotificationContextTypeEnum.COMMENT, detail: NotificationContextDetailEnum.COMMENT_CREATION, id: this.inputData.commentId },
      userIds: [this.data.innovation?.owner.id || ''],
      params: {}
    });

  }

  private async prepareNotificationForAssignedUsers(): Promise<void> {

    const assignedUsers = await this.recipientsService.innovationAssignedUsers({ innovationId: this.inputData.innovationId });

    // Send emails only to users with email preference INSTANTLY.
    for (const user of assignedUsers.filter(item => this.isEmailPreferenceInstantly(EmailNotificationTypeEnum.COMMENT, item.emailNotificationPreferences))) {
      this.emails.push({
        templateId: EmailTypeEnum.COMMENT_CREATION_TO_ASSIGNED_USERS,
        to: { type: 'identityId', value: user.identityId, displayNameParam: 'display_name' },
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          innovation_name: this.data.innovation?.name || '',
          comment_url: new URL(`${this.frontendBaseUrl(user.type)}/innovations/${this.inputData.innovationId}/comments`, ENV.webBaseTransactionalUrl).toString()
        }
      });
    }

    if (assignedUsers.length > 0) {
      this.inApp.push({
        innovationId: this.inputData.innovationId,
        context: { type: NotificationContextTypeEnum.COMMENT, detail: NotificationContextDetailEnum.COMMENT_CREATION, id: this.inputData.commentId },
        userIds: assignedUsers.map(item => item.id),
        params: {}
      });
    }

  }

}
