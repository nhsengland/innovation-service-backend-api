import type { Context } from '@azure/functions';
import { NotificationCategoryEnum, ServiceRoleEnum, type NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import { innovationOverviewUrl } from '../../_helpers/url.helper';
import type { RecipientType } from '../../_services/recipients.service';
import { BaseHandler } from '../base.handler';

export class NeedsAssessmentAssessorUpdateHandler extends BaseHandler<
  NotifierTypeEnum.NEEDS_ASSESSMENT_ASSESSOR_UPDATE,
  'NA06_NEEDS_ASSESSOR_REMOVED' | 'NA07_NEEDS_ASSESSOR_ASSIGNED'
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.NEEDS_ASSESSMENT_ASSESSOR_UPDATE],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);
    if (this.inputData.previousAssessor) {
      const previousAssessor = await this.recipientsService.getUsersRecipient(
        this.inputData.previousAssessor.id,
        ServiceRoleEnum.ASSESSMENT
      );
      this.notifyNA('NA06_NEEDS_ASSESSOR_REMOVED', previousAssessor, innovation.name);
    }

    const newAssessor = await this.recipientsService.getUsersRecipient(
      this.inputData.newAssessor.id,
      ServiceRoleEnum.ASSESSMENT
    );

    this.notifyNA('NA07_NEEDS_ASSESSOR_ASSIGNED', newAssessor, innovation.name);

    return this;
  }

  notifyNA(
    template: 'NA06_NEEDS_ASSESSOR_REMOVED' | 'NA07_NEEDS_ASSESSOR_ASSIGNED',
    recipient: RecipientType | null,
    innovationName: string
  ): void {
    if (!recipient) return;
    this.notify(template, [recipient], {
      email: {
        notificationPreferenceType: NotificationCategoryEnum.NEEDS_ASSESSMENT,
        params: {
          innovation_name: innovationName,
          innovation_overview_url: innovationOverviewUrl(ServiceRoleEnum.ASSESSMENT, this.inputData.innovationId)
        }
      },
      inApp: {
        context: {
          type: NotificationCategoryEnum.NEEDS_ASSESSMENT,
          id: this.inputData.assessmentId,
          detail: template
        },
        innovationId: this.inputData.innovationId,
        params: {
          innovationName: innovationName
        }
      }
    });
  }
}
