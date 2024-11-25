import type { Context } from '@azure/functions';
import { type NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import { randomUUID } from 'crypto';
import { BaseHandler } from '../base.handler';

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
    const surveysWithoutFeedback = await this.recipientsService.innovationsMissingSurveyFeedback('SUPPORT_END', 60, 60);

    for (const survey of surveysWithoutFeedback) {
      const notificationId = randomUUID();

      this.addInApp('AU12_INNOVATOR_SURVEY_END_SUPPORT_TWO_MONTHS_REMINDER', survey.roleIds, {
        context: {
          detail: 'AU12_INNOVATOR_SURVEY_END_SUPPORT_TWO_MONTHS_REMINDER',
          id: survey.innovationId,
          type: 'AUTOMATIC'
        },
        innovationId: survey.innovationId,
        params: { innovationName: survey.innovationName },
        notificationId
      });
    }

    return this;
  }
}
