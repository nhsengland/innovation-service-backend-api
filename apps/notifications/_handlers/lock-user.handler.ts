import { NotificationContextDetailEnum, NotificationContextTypeEnum, NotifierTypeEnum, UserTypeEnum } from '@notifications/shared/enums';
import type { NotifierTemplatesType } from '@notifications/shared/types';

import { container, EmailTypeEnum } from '../_config';
import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';

import { BaseHandler } from './base.handler';


export class LockUserHandler extends BaseHandler<
  NotifierTypeEnum.LOCK_USER,
  EmailTypeEnum.LOCK_USER_TO_LOCKED_USER,
  Record<string, never>
> {

  private recipientsService = container.get<RecipientsServiceType>(RecipientsServiceSymbol);

  constructor(
    requestUser: { id: string, identityId: string, type: UserTypeEnum },
    data: NotifierTemplatesType[NotifierTypeEnum.LOCK_USER]
  ) {
    super(requestUser, data);
  }


  async run(): Promise<this> {

    const userInfo = await this.recipientsService.userInfo(this.inputData.user.id);

    // E-mail to the user who is being locked.
    this.emails.push({
      templateId: EmailTypeEnum.LOCK_USER_TO_LOCKED_USER,
      to: { type: 'identityId', value: this.inputData.user.identityId, displayNameParam: 'display_name' },
      params: {
        // display_name: '', // This will be filled by the email-listener function.
      }
    });

    if (userInfo.type === UserTypeEnum.INNOVATOR) {

      // InApp to all assigned users of locked user innovations.
      const userInnovations = (await this.recipientsService.userInnovationsWithAssignedUsers(this.inputData.user.id));

      for (const innovation of userInnovations) {

        // Filter duplicated ids..
        const uniqueUsers = [...new Map(innovation.assignedUsers.map(item => [`${item.id}_${item.organisationUnitId}`, item])).values()];

        this.inApp.push({
          innovationId: innovation.id,
          context: { type: NotificationContextTypeEnum.INNOVATION, detail: NotificationContextDetailEnum.LOCK_USER, id: innovation.id },
          users: uniqueUsers.map(user => ({ userId: user.id, userType: UserTypeEnum.ACCESSOR, organisationUnitId: user.organisationUnitId })),
          params: {}
        });
      }
    }

    return this;

  }

}
