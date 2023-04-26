import { EmailNotificationTypeEnum, NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { container, EmailTypeEnum } from '../_config';
import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';

import { BaseHandler } from './base.handler';

export class InnovationWithdrawnHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_WITHDRAWN,
  EmailTypeEnum.INNOVATION_WITHDRAWN_TO_ASSIGNED_USERS,
  Record<string, never>
> {
  private recipientsService = container.get<RecipientsServiceType>(RecipientsServiceSymbol);

  constructor(
    requestUser: { id: string; identityId: string },
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_WITHDRAWN],
    domainContext: DomainContextType
  ) {
    super(requestUser, data, domainContext);
  }

  async run(): Promise<this> {
    const assignedUsers = await this.recipientsService.usersInfo(
      this.inputData.innovation.assignedUserIds
    );
    const uniqueAssignedUsers = [
      ...new Map(assignedUsers.map((item) => [item['id'], item])).values(),
    ];

    // Send emails only to users with email preference INSTANTLY.
    for (const user of uniqueAssignedUsers.filter((item) =>
      this.isEmailPreferenceInstantly(
        EmailNotificationTypeEnum.SUPPORT,
        item.emailNotificationPreferences
      )
    )) {
      this.emails.push({
        templateId: EmailTypeEnum.INNOVATION_WITHDRAWN_TO_ASSIGNED_USERS,
        to: { type: 'identityId', value: user.identityId, displayNameParam: 'display_name' },
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          innovation_name: this.inputData.innovation.name,
        },
      });
    }

    return this;
  }
}
