import { NotifierTypeEnum, UserTypeEnum } from '@notifications/shared/enums';
import type { NotifierTemplatesType } from '@notifications/shared/types';

import { container, EmailTypeEnum } from '../_config';
import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';

import { BaseHandler } from './base.handler';


export class DailyDigestHandler extends BaseHandler<
  NotifierTypeEnum.DAILY_DIGEST,
  EmailTypeEnum.INNOVATOR_DAILY_DIGEST | EmailTypeEnum.ACCESSOR_DAILY_DIGEST,
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

    await this.notifyDailyDigest();

    return this;

  }


  private async notifyDailyDigest(): Promise<void> {

    const dailyDigestUsers = await this.recipientsService.dailyDigestUsersWithCounts();

    for (const user of dailyDigestUsers) {
      this.emails.push({
        templateId: user.type === UserTypeEnum.INNOVATOR ? EmailTypeEnum.INNOVATOR_DAILY_DIGEST : EmailTypeEnum.ACCESSOR_DAILY_DIGEST,
        to: { type: 'identityId', value: user.identityId, displayNameParam: 'display_name' },
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          messages_count: user.messagesCount.toString(),
          actions_count: user.actionsCount.toString(),
          supports_count: user.supportsCount.toString(),
        }
      });
    }

  }
}
