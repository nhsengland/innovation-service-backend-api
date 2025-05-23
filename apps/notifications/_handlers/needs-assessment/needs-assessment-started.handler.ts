import type { Context } from '@azure/functions';
import { ServiceRoleEnum, type NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import { threadUrl } from '../../_helpers/url.helper';
import { BaseHandler } from '../base.handler';
import { randomUUID } from 'crypto';

export class NeedsAssessmentStartedHandler extends BaseHandler<
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
    const notificationId = randomUUID();

    this.notify('NA03_NEEDS_ASSESSMENT_STARTED_TO_INNOVATOR', recipients, {
      email: {
        notificationPreferenceType: 'NEEDS_ASSESSMENT',
        params: {
          innovation_name: innovation.name,
          message: this.inputData.message,
          message_url: threadUrl(
            ServiceRoleEnum.INNOVATOR,
            this.inputData.innovationId,
            this.inputData.threadId,
            notificationId
          )
        }
      },
      inApp: {
        context: {
          type: 'NEEDS_ASSESSMENT',
          id: this.inputData.assessmentId,
          detail: 'NA03_NEEDS_ASSESSMENT_STARTED_TO_INNOVATOR'
        },
        innovationId: this.inputData.innovationId,
        params: {
          innovationName: innovation.name,
          messageId: this.inputData.messageId,
          threadId: this.inputData.threadId
        },
        notificationId
      }
    });

    return this;
  }
}
