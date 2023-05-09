import {
  EmailNotificationPreferenceEnum,
  EmailNotificationTypeEnum,
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
  NotifierTypeEnum
} from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import { container, EmailTypeEnum, ENV } from '../_config';
import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';
import { BaseHandler } from './base.handler';
import type { UserRoleEntity } from '@notifications/shared/entities';

export class NeedsAssessmentStartedHandler extends BaseHandler<
  NotifierTypeEnum.NEEDS_ASSESSMENT_STARTED,
  EmailTypeEnum.NEEDS_ASSESSMENT_STARTED_TO_INNOVATOR,
  Record<string, never>
> {
  private recipientsService = container.get<RecipientsServiceType>(RecipientsServiceSymbol);

  private data: {
    innovation?: {
      name: string;
      owner: {
        id: string;
        identityId: string;
        isActive: boolean;
        userRole: UserRoleEntity;
        emailNotificationPreferences: {
          type: EmailNotificationTypeEnum;
          preference: EmailNotificationPreferenceEnum;
        }[];
      };
    };
  } = {};

  constructor(
    requestUser: { id: string; identityId: string },
    data: NotifierTemplatesType[NotifierTypeEnum.NEEDS_ASSESSMENT_STARTED],
    domainContext: DomainContextType
  ) {
    super(requestUser, data, domainContext);
  }

  async run(): Promise<this> {
    this.data.innovation = await this.recipientsService.innovationInfoWithOwner(this.inputData.innovationId);

    await this.prepareEmailForInnovator();
    await this.prepareInAppForInnovator();

    return this;
  }

  async prepareEmailForInnovator(): Promise<void> {
    if (this.data.innovation?.owner.isActive) {
      this.emails.push({
        templateId: EmailTypeEnum.NEEDS_ASSESSMENT_STARTED_TO_INNOVATOR,
        to: {
          type: 'identityId',
          value: this.data.innovation?.owner.identityId || '',
          displayNameParam: 'display_name'
        },
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          innovation_name: this.data.innovation?.name || '',
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
  }

  async prepareInAppForInnovator(): Promise<void> {
    //this never happens
    if (!this.data.innovation) {
      return;
    }

    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: {
        type: NotificationContextTypeEnum.NEEDS_ASSESSMENT,
        detail: NotificationContextDetailEnum.NEEDS_ASSESSMENT_STARTED,
        id: this.inputData.assessmentId
      },
      userRoleIds: [this.data.innovation?.owner.userRole.id],
      params: {}
    });
  }
}
