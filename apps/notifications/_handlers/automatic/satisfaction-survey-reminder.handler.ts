import type { Context } from '@azure/functions';
import { ServiceRoleEnum, type NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import { BaseHandler } from '../base.handler';
import { randomUUID } from 'crypto';

export class SatisfactionSurveyReminderHandler extends BaseHandler<
  NotifierTypeEnum.SURVEY_END_SUPPORT_REMINDER,
  'AU12_INNOVATOR_SURVEY_END_SUPPORT_TWO_MONTHS_REMINDER'
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.SURVEY_END_SUPPORT_REMINDER],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    // TODO: Implement logic
    const surveysWithoutFeedback = await this.recipientsService.surveyWithoutFeedbackForNDays('SUPPORT_END', 60, 60);

    for (const survey of surveysWithoutFeedback) {
      const notificationId = randomUUID();

      const innovation = await this.recipientsService.innovationInfo(survey.innovation.id);
      const innovators = await this.recipientsService.getInnovationActiveOwnerAndCollaborators(innovation.id);
      const recipients = await this.recipientsService.getUsersRecipient(innovators, ServiceRoleEnum.INNOVATOR);

      this.addInApp('AU12_INNOVATOR_SURVEY_END_SUPPORT_TWO_MONTHS_REMINDER', recipients, {
        context: {
          detail: 'AU12_INNOVATOR_SURVEY_END_SUPPORT_TWO_MONTHS_REMINDER',
          id: survey.innovation.id,
          type: 'AUTOMATIC'
        },
        innovationId: survey.innovation.id,
        params: { innovationName: innovation.name },
        notificationId
      });
    }

    return this;
  }
}
