import type { Context } from '@azure/functions';
import { NotificationCategoryEnum, ServiceRoleEnum, type NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import { threadUrl } from '../../_helpers/url.helper';
import { BaseHandler } from '../base.handler';

export class AssessmentStartedHandler extends BaseHandler<
  NotifierTypeEnum.NEEDS_ASSESSMENT_STARTED,
  'NA03_NEEDS_ASSESSMENT_STARTED_TO_INNOVATOR'
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.NEEDS_ASSESSMENT_STARTED],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);
    const innovators = await this.recipientsService.getInnovationActiveOwnerAndCollaborators(
      this.inputData.innovationId
    );
    const recipients = await this.recipientsService.getUsersRecipient(innovators, ServiceRoleEnum.INNOVATOR);

    this.notify('NA03_NEEDS_ASSESSMENT_STARTED_TO_INNOVATOR', recipients, {
      email: {
        notificationPreferenceType: NotificationCategoryEnum.NEEDS_ASSESSMENT,
        params: {
          innovation_name: innovation.name,
          message: this.inputData.message,
          message_url: threadUrl(ServiceRoleEnum.INNOVATOR, this.inputData.innovationId, this.inputData.threadId)
        }
      },
      inApp: {
        context: {
          type: NotificationCategoryEnum.NEEDS_ASSESSMENT,
          id: this.inputData.assessmentId,
          detail: 'NA03_NEEDS_ASSESSMENT_STARTED_TO_INNOVATOR'
        },
        innovationId: this.inputData.innovationId,
        params: {
          innovationName: innovation.name,
          messageId: this.inputData.threadId,
          threadId: this.inputData.threadId
        }
      }
    });

    return this;
  }
}
