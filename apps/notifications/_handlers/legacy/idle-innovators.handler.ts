import type { NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { EmailTypeEnum } from '../../_config';

import type { Context } from '@azure/functions';
import { BaseHandler } from '../base.handler';

export class IdleInnovatorsHandler extends BaseHandler<
  NotifierTypeEnum.INCOMPLETE_INNOVATION_RECORD,
  EmailTypeEnum.INNOVATOR_INCOMPLETE_RECORD,
  never
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.DAILY_DIGEST],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    await this.notifyIdleInnovators();

    return this;
  }

  private async notifyIdleInnovators(): Promise<void> {
    const idleInnovators = await this.recipientsService.incompleteInnovationRecordOwners();

    for (const user of idleInnovators) {
      this.emails.push({
        templateId: EmailTypeEnum.INNOVATOR_INCOMPLETE_RECORD,
        to: user.recipient,
        notificationPreferenceType: null,
        params: {
          innovation_name: user.innovationName
        }
      });
    }
  }
}
