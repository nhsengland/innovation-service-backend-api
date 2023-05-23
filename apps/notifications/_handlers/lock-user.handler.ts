import {
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
  NotifierTypeEnum,
  ServiceRoleEnum
} from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { EmailTypeEnum } from '../_config';

import { BaseHandler } from './base.handler';
import type { Context } from '@azure/functions';

export class LockUserHandler extends BaseHandler<
  NotifierTypeEnum.LOCK_USER,
  EmailTypeEnum.LOCK_USER_TO_LOCKED_USER,
  Record<string, never>
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.LOCK_USER],
    azureContext: Context
) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const userId = await this.recipientsService.identityId2UserId(this.inputData.user.identityId);
    const identityInfo = await this.recipientsService.usersIdentityInfo(this.inputData.user.identityId);

    if (!userId) {
      // this will never happen, query includes deleted, but if it did we wouldn't be able to handle it anyway
      return this;
    }

    if (identityInfo) {
      // E-mail to the user who is being locked.
      this.emails.push({
        templateId: EmailTypeEnum.LOCK_USER_TO_LOCKED_USER,
        to: { email: identityInfo.email, displayname: identityInfo.displayName },
        notificationPreferenceType: null,
        params: {
          // display_name: '', // This will be filled by the email-listener function.
        }
      });
    }

    const userInnovatorRole = await this.recipientsService.getUsersRecipient(userId, ServiceRoleEnum.INNOVATOR, {
      withDeleted: true
    });

    if (userInnovatorRole) {
      // InApp to all assigned users of locked user innovations.
      const userInnovations = await this.recipientsService.userInnovationsWithAssignedRecipients(userId);

      for (const innovation of userInnovations) {
        // Filter duplicated ids..
        const uniqueUsers = [...new Set(innovation.assignedUsers.map(user => user.roleId))];

        this.inApp.push({
          innovationId: innovation.id,
          context: {
            type: NotificationContextTypeEnum.INNOVATION,
            detail: NotificationContextDetailEnum.LOCK_USER,
            id: innovation.id
          },
          userRoleIds: uniqueUsers,
          params: {}
        });
      }
    }

    return this;
  }
}
