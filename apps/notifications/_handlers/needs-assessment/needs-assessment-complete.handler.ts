import type { Context } from '@azure/functions';
import { NotificationCategoryEnum, ServiceRoleEnum, type NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import { assessmentUrl, dataSharingPreferencesUrl } from '../../_helpers/url.helper';
import { BaseHandler } from '../base.handler';

export class NeedsAssessmentCompleteHandler extends BaseHandler<
  NotifierTypeEnum.NEEDS_ASSESSMENT_COMPLETED,
  'NA04_NEEDS_ASSESSMENT_COMPLETE_TO_INNOVATOR'
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.NEEDS_ASSESSMENT_COMPLETED],
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

    this.notify('NA04_NEEDS_ASSESSMENT_COMPLETE_TO_INNOVATOR', recipients, {
      email: {
        notificationPreferenceType: NotificationCategoryEnum.NEEDS_ASSESSMENT,
        params: {
          innovation_name: innovation.name,
          needs_assessment_url: assessmentUrl(
            ServiceRoleEnum.INNOVATOR,
            this.inputData.innovationId,
            this.inputData.assessmentId
          ),
          data_sharing_preferences_url: dataSharingPreferencesUrl(
            ServiceRoleEnum.INNOVATOR,
            this.inputData.innovationId
          )
        }
      },
      inApp: {
        context: {
          type: NotificationCategoryEnum.NEEDS_ASSESSMENT,
          id: this.inputData.assessmentId,
          detail: 'NA04_NEEDS_ASSESSMENT_COMPLETE_TO_INNOVATOR'
        },
        innovationId: this.inputData.innovationId,
        params: {
          innovationName: innovation.name,
          assessmentId: this.inputData.assessmentId
        }
      }
    });

    return this;
  }
}
