import {
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
  NotifierTypeEnum,
  ServiceRoleEnum
} from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { EmailTypeEnum } from '../_config';

import type { RecipientType } from '../_services/recipients.service';
import { BaseHandler } from './base.handler';

export class InnovatorAccountDeletionHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATOR_ACCOUNT_DELETION_WITH_PENDING_TRANSFER,
  EmailTypeEnum.ACCOUNT_DELETION_WITH_TRANSFER_TO_COLLABORATOR,
  Record<string, never>
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATOR_ACCOUNT_DELETION_WITH_PENDING_TRANSFER],
  ) {
    super(requestUser, data);
  }

  async run(): Promise<this> {
    for (const innovation of this.inputData['innovations']) {
      const innovationCollaboratorIds = await this.recipientsService.getInnovationActiveCollaborators(innovation.id);
      const innovationCollaborators = await this.recipientsService.getUsersRecipient(
        innovationCollaboratorIds,
        ServiceRoleEnum.INNOVATOR
      );

      if (innovationCollaborators.length > 0) {
        await this.prepareEmailForCollaborators(
          innovationCollaborators,
          innovation.name,
          innovation.transferExpireDate
        );

        await this.prepareInAppForCollaborators(
          innovationCollaborators.map(user => user.roleId),
          innovation.id
        );
      }
    }
    return this;
  }

  async prepareEmailForCollaborators(
    recipients: RecipientType[],
    innovationName: string,
    transferExpireDate: string
  ): Promise<void> {
    for (const recipient of recipients) {
      this.emails.push({
        templateId: EmailTypeEnum.ACCOUNT_DELETION_WITH_TRANSFER_TO_COLLABORATOR,
        to: recipient,
        notificationPreferenceType: null,
        params: {
          //display_name is filled automatically
          innovation_name: innovationName,
          transfer_expiry_date: transferExpireDate
        }
      });
    }
  }

  async prepareInAppForCollaborators(userRoleIds: string[], innovationId: string): Promise<void> {
    this.inApp.push({
      innovationId: innovationId,
      context: {
        type: NotificationContextTypeEnum.INNOVATION,
        detail: NotificationContextDetailEnum.TRANSFER_PENDING,
        id: innovationId
      },
      userRoleIds,
      params: {}
    });
  }
}
