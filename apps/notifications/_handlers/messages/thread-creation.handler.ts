import type { Context } from '@azure/functions';
import { ServiceRoleEnum, type NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import { HandlersHelper } from '../../_helpers/handlers.helper';
import { threadUrl } from '../../_helpers/url.helper';
import { BaseHandler } from '../base.handler';

export class ThreadCreationHandler extends BaseHandler<NotifierTypeEnum.THREAD_CREATION, 'ME01_THREAD_CREATION'> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.THREAD_CREATION],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);
    const recipients = await this.recipientsService.threadFollowerRecipients(this.inputData.threadId);

    const recipientsByRole = this.recipientsService.getRecipientsByRole(recipients);

    const senderName = await this.getRequestUserName();
    const displayTag = HandlersHelper.getNotificationDisplayTag(this.requestUser.currentRole.role, {
      unitName: this.requestUser.organisation?.organisationUnit?.name
    });

    for (const [role, roleRecipients] of Object.entries(recipientsByRole)) {
      this.addEmails('ME01_THREAD_CREATION', roleRecipients, {
        notificationPreferenceType: 'MESSAGES',
        params: {
          innovation_name: innovation.name,
          sender: `${senderName} (${displayTag})`,
          thread_url: threadUrl(role as ServiceRoleEnum, innovation.id, this.inputData.threadId)
        }
      });
    }

    this.addInApp('ME01_THREAD_CREATION', recipients, {
      innovationId: this.inputData.innovationId,
      context: {
        type: 'MESSAGES',
        detail: 'ME01_THREAD_CREATION',
        id: this.inputData.threadId
      },
      params: {
        innovationName: innovation.name,
        senderDisplayInformation:
          this.requestUser.currentRole.role === ServiceRoleEnum.INNOVATOR ? senderName : displayTag,
        messageId: this.inputData.messageId,
        threadId: this.inputData.threadId
      }
    });

    return this;
  }
}
