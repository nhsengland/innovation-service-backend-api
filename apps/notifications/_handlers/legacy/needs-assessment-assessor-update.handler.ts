import { NotifierTypeEnum, ServiceRoleEnum } from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { ENV } from '../../_config';

import type { Context } from '@azure/functions';
import { BaseHandler } from '../base.handler';

export class NeedsAssessmentAssessorUpdateHandler extends BaseHandler<
  NotifierTypeEnum.NEEDS_ASSESSMENT_ASSESSOR_UPDATE,
  'MIGRATION_OLD'
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

    const previousAssessor = await this.recipientsService.getUsersRecipient(
      this.inputData.previousAssessor?.id,
      ServiceRoleEnum.ASSESSMENT
    );

    const newAssessor = await this.recipientsService.getUsersRecipient(
      this.inputData.newAssessor.id,
      ServiceRoleEnum.ASSESSMENT
    );

    // Prepare email for previous NA.
    if (previousAssessor) {
      this.emails.push({
        templateId: 'NEEDS_ASSESSMENT_ASSESSOR_UPDATE_TO_OLD_NA',
        to: previousAssessor,
        notificationPreferenceType: null,
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          innovation_name: innovation.name,
          innovation_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('assessment/innovations/:innovationId')
            .setPathParams({ innovationId: this.inputData.innovationId })
            .buildUrl()
        }
      });
    }

    // Prepare email for new NA.
    if (newAssessor) {
      this.emails.push({
        templateId: 'NEEDS_ASSESSMENT_ASSESSOR_UPDATE_TO_NEW_NA',
        to: newAssessor,
        notificationPreferenceType: null,
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          innovation_name: innovation.name,
          innovation_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('assessment/innovations/:innovationId')
            .setPathParams({
              innovationId: this.inputData.innovationId,
              assessmentId: this.inputData.assessmentId
            })
            .buildUrl()
        }
      });
    }

    return this;
  }
}
