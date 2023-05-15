import {
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
  NotifierTypeEnum
} from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { EmailTypeEnum } from '../_config';

import { BaseHandler } from './base.handler';

export class InnovationWithdrawnHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_WITHDRAWN,
  EmailTypeEnum.INNOVATION_WITHDRAWN_TO_ASSIGNED_USERS,
  Record<string, string>
> {
  constructor(
    requestUser: { id: string; identityId: string },
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_WITHDRAWN],
    domainContext: DomainContextType
  ) {
    super(requestUser, data, domainContext);
  }

  async run(): Promise<this> {
    const assignedUsers = await this.recipientsService.usersBagToRecipients(
      this.inputData.innovation.affectedUsers.map(u => ({
        id: u.userId,
        userType: u.userType,
        organisationUnit: u.organisationUnitId
      }))
    );
    const uniqueAssignedUsers = [...new Map(assignedUsers.map(item => [item['userId'], item])).values()];

    // Send emails only to users with email preference INSTANTLY.
    for (const user of uniqueAssignedUsers) {
      this.emails.push({
        templateId: EmailTypeEnum.INNOVATION_WITHDRAWN_TO_ASSIGNED_USERS,
        notificationPreferenceType: 'SUPPORT',
        to: user,
        params: {
          innovation_name: this.inputData.innovation.name
        }
      });
    }

    if (assignedUsers.length) {
      this.inApp.push({
        innovationId: this.inputData.innovation.id,
        context: {
          type: NotificationContextTypeEnum.INNOVATION,
          detail: NotificationContextDetailEnum.INNOVATION_WITHDRAWN,
          id: this.inputData.innovation.id
        },
        userRoleIds: assignedUsers.map(u => u.roleId),
        params: {
          innovationName: this.inputData.innovation.name
        }
      });
    }

    return this;
  }
}
