import {
  EmailNotificationTypeEnum,
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
  NotifierTypeEnum,
} from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { container, EmailTypeEnum } from '../_config';
import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';

import { BaseHandler } from './base.handler';

export class InnovationWithdrawnHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_WITHDRAWN,
  EmailTypeEnum.INNOVATION_WITHDRAWN_TO_ASSIGNED_USERS,
  Record<string, string>
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
      this.inputData.innovation.affectedUsers.map((u) => u.userId)
    );
    const uniqueAssignedUsers = [
      ...new Map(assignedUsers.map((item) => [item['id'], item])).values(),
    ];

    // Send emails only to users with email preference INSTANTLY.
    for (const user of uniqueAssignedUsers.filter((user) =>
      this.isEmailPreferenceInstantly(
        EmailNotificationTypeEnum.SUPPORT,
        user.emailNotificationPreferences
      )
    )) {
      this.emails.push({
        templateId: EmailTypeEnum.INNOVATION_WITHDRAWN_TO_ASSIGNED_USERS,
        to: { type: 'identityId', value: user.identityId, displayNameParam: 'display_name' },
        params: {
          innovation_name: this.inputData.innovation.name,
        },
      });
    }

    const userRoleIds: string[] = [];
    for (const user of this.inputData.innovation.affectedUsers) {
      const userRole = await this.recipientsService.getUserRole(user.userId, user.userType, {
        organisation: user.organisationId,
        organisationUnit: user.organisationUnitId,
      });

      if (userRole) {
        userRoleIds.push(userRole.id);
      }
    }

    if (userRoleIds.length) {
      this.inApp.push({
        innovationId: this.inputData.innovation.id,
        context: {
          type: NotificationContextTypeEnum.INNOVATION,
          detail: NotificationContextDetailEnum.INNOVATION_WITHDRAWN,
          id: this.inputData.innovation.id,
        },
        userRoleIds,
        params: {
          innovationName: this.inputData.innovation.name,
        },
      });
    }

    return this;
  }
}
