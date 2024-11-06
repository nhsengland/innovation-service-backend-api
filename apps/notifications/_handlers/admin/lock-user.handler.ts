import type { Context } from '@azure/functions';
import { ServiceRoleEnum, type NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import type { RecipientType } from '../../_services/recipients.service';
import { BaseHandler } from '../base.handler';
import { randomUUID } from 'crypto';

export class LockUserHandler extends BaseHandler<
  NotifierTypeEnum.LOCK_USER,
  'AP02_INNOVATOR_LOCKED_TO_ASSIGNED_USERS' | 'AP03_USER_LOCKED_TO_LOCKED_USER'
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.LOCK_USER],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const userId = await this.recipientsService.identityId2UserId(this.inputData.identityId);

    if (!userId) {
      // this will never happen, query includes deleted, but if it did we wouldn't be able to handle it anyway
      return this;
    }

    const recipient = await this.recipientsService.getUsersRecipient(userId, [
      ServiceRoleEnum.ACCESSOR,
      ServiceRoleEnum.QUALIFYING_ACCESSOR,
      ServiceRoleEnum.ASSESSMENT,
      ServiceRoleEnum.INNOVATOR
    ]);

    if (recipient) {
      await this.AP03_USER_LOCKED_TO_LOCKED_USER(recipient);
      if (recipient.role === ServiceRoleEnum.INNOVATOR) {
        await this.AP02_INNOVATOR_LOCKED_TO_ASSIGNED_USERS(userId);
      }
    }

    return this;
  }

  private async AP02_INNOVATOR_LOCKED_TO_ASSIGNED_USERS(lockedUserId: string): Promise<void> {
    const innovations = await this.recipientsService.userInnovationsWithAssignedRecipients(lockedUserId);
    const notificationId = randomUUID();

    for (const innovation of innovations) {
      this.addInApp('AP02_INNOVATOR_LOCKED_TO_ASSIGNED_USERS', innovation.assignedUsers, {
        context: {
          detail: 'AP02_INNOVATOR_LOCKED_TO_ASSIGNED_USERS',
          id: innovation.id,
          type: 'ADMIN'
        },
        innovationId: innovation.id,
        params: { innovationName: innovation.name },
        notificationId
      });
    }
  }

  private async AP03_USER_LOCKED_TO_LOCKED_USER(recipient: RecipientType): Promise<void> {
    this.addEmails('AP03_USER_LOCKED_TO_LOCKED_USER', [recipient], {
      notificationPreferenceType: 'ADMIN',
      params: {},
      options: { includeLocked: true }
    });
  }
}
