import { NotifierTypeEnum, ServiceRoleEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import type { Context } from '@azure/functions';
import { BaseHandler } from '../base.handler';

export class DailyDigestHandler extends BaseHandler<NotifierTypeEnum.DAILY_DIGEST, 'MIGRATION_OLD'> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.DAILY_DIGEST],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    await this.notifyDailyDigest();

    return this;
  }

  private async notifyDailyDigest(): Promise<void> {
    const dailyDigestUsers = await this.recipientsService.dailyDigestUsersWithCounts();

    for (const user of dailyDigestUsers) {
      this.emails.push({
        templateId:
          user.recipient.role === ServiceRoleEnum.INNOVATOR ? 'INNOVATOR_DAILY_DIGEST' : 'ACCESSOR_DAILY_DIGEST',
        to: user.recipient,
        notificationPreferenceType: null,
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          messages_count: user.messagesCount.toString(),
          actions_count: user.tasksCount.toString(),
          supports_count: user.supportsCount.toString()
        }
      });
    }
  }
}
