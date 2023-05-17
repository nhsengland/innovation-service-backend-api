import {
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
  NotifierTypeEnum,
  ServiceRoleEnum
} from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import { ENV, EmailTypeEnum } from '../_config';
import type { RecipientType } from '../_services/recipients.service';
import { BaseHandler } from './base.handler';

export class NeedsAssessmentStartedHandler extends BaseHandler<
  NotifierTypeEnum.NEEDS_ASSESSMENT_STARTED,
  EmailTypeEnum.NEEDS_ASSESSMENT_STARTED_TO_INNOVATOR,
  Record<string, never>
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.NEEDS_ASSESSMENT_STARTED],
  ) {
    super(requestUser, data);
  }

  async run(): Promise<this> {
    const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);
    const owner = await this.recipientsService.getUsersRecipient(innovation.ownerId, ServiceRoleEnum.INNOVATOR);

    if (owner) {
      await this.prepareEmailForInnovator(innovation.name, owner);
      await this.prepareInAppForInnovator(owner);
    }
    return this;
  }

  async prepareEmailForInnovator(innovationName: string, owner: RecipientType): Promise<void> {
    this.emails.push({
      templateId: EmailTypeEnum.NEEDS_ASSESSMENT_STARTED_TO_INNOVATOR,
      to: owner,
      notificationPreferenceType: null,
      params: {
        // display_name: '', // This will be filled by the email-listener function.
        innovation_name: innovationName,
        message_url: new UrlModel(ENV.webBaseTransactionalUrl)
          .addPath('innovator/innovations/:innovationId/threads/:threadId')
          .setPathParams({
            innovationId: this.inputData.innovationId,
            threadId: this.inputData.threadId
          })
          .buildUrl()
      }
    });
  }

  async prepareInAppForInnovator(owner: RecipientType): Promise<void> {
    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: {
        type: NotificationContextTypeEnum.NEEDS_ASSESSMENT,
        detail: NotificationContextDetailEnum.NEEDS_ASSESSMENT_STARTED,
        id: this.inputData.assessmentId
      },
      userRoleIds: [owner.roleId],
      params: {}
    });
  }
}
