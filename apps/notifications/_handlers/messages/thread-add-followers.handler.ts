import type { Context } from '@azure/functions';
import { ServiceRoleEnum, type NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import { HandlersHelper } from '../../_helpers/handlers.helper';
import { threadUrl } from '../../_helpers/url.helper';
import { BaseHandler } from '../base.handler';
import { randomUUID } from 'crypto';

export class ThreadAddFollowersHandler extends BaseHandler<
  NotifierTypeEnum.THREAD_ADD_FOLLOWERS,
  'ME02_THREAD_ADD_FOLLOWERS'
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.THREAD_ADD_FOLLOWERS],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);
    const recipients = (await this.recipientsService.threadFollowerRecipients(this.inputData.threadId)).filter(r =>
      this.inputData.newFollowersRoleIds.includes(r.roleId)
    );

    const recipientsByRole = this.recipientsService.getRecipientsByRole(recipients);

    const senderName = await this.getRequestUserName();
    const displayTag = HandlersHelper.getNotificationDisplayTag(this.requestUser.currentRole.role, {
      unitName: this.requestUser.organisation?.organisationUnit?.name
    });
    const notificationId = randomUUID();

    for (const [role, roleRecipients] of Object.entries(recipientsByRole)) {
      this.addEmails('ME02_THREAD_ADD_FOLLOWERS', roleRecipients, {
        notificationPreferenceType: 'MESSAGES',
        params: {
          innovation_name: innovation.name,
          sender: `${senderName} (${displayTag})`,
          thread_url: threadUrl(role as ServiceRoleEnum, innovation.id, this.inputData.threadId, notificationId)
        }
      });
    }

    this.addInApp('ME02_THREAD_ADD_FOLLOWERS', recipients, {
      innovationId: this.inputData.innovationId,
      context: {
        type: 'MESSAGES',
        detail: 'ME02_THREAD_ADD_FOLLOWERS',
        id: this.inputData.threadId
      },
      params: {
        innovationName: innovation.name,
        senderDisplayInformation:
          this.requestUser.currentRole.role === ServiceRoleEnum.INNOVATOR ? senderName : displayTag,
        threadId: this.inputData.threadId
      },
      notificationId
    });

    return this;
  }
}
