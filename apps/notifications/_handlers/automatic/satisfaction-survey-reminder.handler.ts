import type { Context } from '@azure/functions';
import type { NotifierTypeEnum } from '@notifications/shared/enums';
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

    const notificationId = randomUUID();

    this.addInApp('AU12_INNOVATOR_SURVEY_END_SUPPORT_TWO_MONTHS_REMINDER', recipient, {
      context: {
        detail: 'AU12_INNOVATOR_SURVEY_END_SUPPORT_TWO_MONTHS_REMINDER',
        id: innovation.id,
        type: 'AUTOMATIC'
      },
      innovationId: innovation.id,
      params: { innovationName: innovation.name },
      notificationId
    });

    return this;
  }
}
