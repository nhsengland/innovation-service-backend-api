import type { NotifierTypeEnum, UserTypeEnum } from '@notifications/shared/enums';
import type { NotifierTemplatesType } from '@notifications/shared/types';

import { container, EmailTypeEnum } from '../_config';
import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';

import { BaseHandler } from './base.handler';


export class IdleSupportHandler extends BaseHandler<
  NotifierTypeEnum.IDLE_SUPPORT,
  EmailTypeEnum.QA_A_IDLE_SUPPORT,
  Record<string, never>
> {

  private recipientsService = container.get<RecipientsServiceType>(RecipientsServiceSymbol);

  constructor(
    requestUser: { id: string; identityId: string; type: UserTypeEnum },
    data: NotifierTemplatesType[NotifierTypeEnum.DAILY_DIGEST]
  ) {
    super(requestUser, data);
  }


  async run(): Promise<this> {

    await this.notifyIdleAccessors();

    return this;

  }

  private async notifyIdleAccessors(): Promise<void> {

    const idleInnovators = await this.recipientsService.incompleteInnovationRecordOwners();

    for (const user of idleInnovators) {
      //TODO: Refactor this to just call B2C once and then do a dictionary search instead
      const innovator = await this.recipientsService.userInfo(user.id);

      this.emails.push({
        templateId: EmailTypeEnum.INNOVATOR_INCOMPLETE_RECORD,
        to: { type: 'identityId', value: user.identityId, displayNameParam: 'display_name' },
        params: {
          innovation_name: user.innovationName,
          innovator_name: innovator.name,
        }
      });
    }

  }

}
