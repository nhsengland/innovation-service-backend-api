import type { NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { container, EmailTypeEnum } from '../_config';
import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';

import { BaseHandler } from './base.handler';


export class IdleInnovatorsHandler extends BaseHandler<
  NotifierTypeEnum.INCOMPLETE_INNOVATION_RECORD,
  EmailTypeEnum.INNOVATOR_INCOMPLETE_RECORD,
  Record<string, never>
> {

  private recipientsService = container.get<RecipientsServiceType>(RecipientsServiceSymbol);

  constructor(
    requestUser: { id: string; identityId: string; },
    data: NotifierTemplatesType[NotifierTypeEnum.DAILY_DIGEST],
    domainContext: DomainContextType,
  ) {
    super(requestUser, data, domainContext);
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
        to: { type: 'identityId', value: user.identityId, displayNameParam: 'display_name' },
        params: {
          innovation_name: user.innovationName,
        }
      });
    }

  }

}
