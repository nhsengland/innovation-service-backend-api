import { NotifierTypeEnum, ServiceRoleEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { EmailTypeEnum } from '../_config';

import { BaseHandler } from './base.handler';

export class DailyDigestHandler extends BaseHandler<
  NotifierTypeEnum.DAILY_DIGEST,
  EmailTypeEnum.INNOVATOR_DAILY_DIGEST | EmailTypeEnum.ACCESSOR_DAILY_DIGEST,
  Record<string, never>
> {
  constructor(
    requestUser: { id: string; identityId: string },
    data: NotifierTemplatesType[NotifierTypeEnum.DAILY_DIGEST],
    domainContext: DomainContextType
  ) {
    super(requestUser, data, domainContext);
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
          user.recipient.role === ServiceRoleEnum.INNOVATOR
            ? EmailTypeEnum.INNOVATOR_DAILY_DIGEST
            : EmailTypeEnum.ACCESSOR_DAILY_DIGEST,
        to: user.recipient,
        notificationPreferenceType: null,
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          messages_count: user.messagesCount.toString(),
          actions_count: user.actionsCount.toString(),
          supports_count: user.supportsCount.toString()
        }
      });
    }
  }
}
