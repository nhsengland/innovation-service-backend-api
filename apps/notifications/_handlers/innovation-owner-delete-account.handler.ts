import {
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
  NotifierTypeEnum
} from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { container, EmailTypeEnum } from '../_config';
import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';

import { BaseHandler } from './base.handler';

export class InnovatorAccountDeletionHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATOR_ACCOUNT_DELETION_WITH_PENDING_TRANSFER,
  EmailTypeEnum.ACCOUNT_DELETION_WITH_TRANSFER_TO_COLLABORATOR,
  Record<string, never>
> {
  private recipientsService = container.get<RecipientsServiceType>(RecipientsServiceSymbol);

  constructor(
    requestUser: { id: string; identityId: string },
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATOR_ACCOUNT_DELETION_WITH_PENDING_TRANSFER],
    domainContext: DomainContextType
  ) {
    super(requestUser, data, domainContext);
  }

  async run(): Promise<this> {
    for (const innovation of this.inputData['innovations']) {
      const innovationCollaboratorUsers = (
        await this.recipientsService.innovationActiveCollaboratorUsers(innovation.id)
      ).filter(user => user.isActive);

      if (innovationCollaboratorUsers.length > 0) {
        await this.prepareEmailForCollaborators(
          innovationCollaboratorUsers.map(user => user.identityId),
          innovation.name,
          innovation.transferExpireDate
        );
      }

      await this.prepareInAppForCollaborators(
        innovationCollaboratorUsers.map(user => user.userRole.id),
        { id: innovation.id, name: innovation.name }
      );
    }
    return this;
  }

  async prepareEmailForCollaborators(
    userIdentityIds: string[],
    innovationName: string,
    transferExpireDate: Date
  ): Promise<void> {
    for (const identityId of userIdentityIds) {
      this.emails.push({
        templateId: EmailTypeEnum.ACCOUNT_DELETION_WITH_TRANSFER_TO_COLLABORATOR,
        to: { type: 'identityId', value: identityId, displayNameParam: 'display_name' },
        params: {
          //display_name is filled automatically
          innovation_name: innovationName,
          transfer_expiry_date: transferExpireDate
        }
      });
    }
  }

  async prepareInAppForCollaborators(userRoleIds: string[], innovation: { id: string; name: string }): Promise<void> {
    this.inApp.push({
      innovationId: innovation.id,
      context: {
        type: NotificationContextTypeEnum.INNOVATION,
        detail: NotificationContextDetailEnum.TRANSFER_PENDING,
        id: innovation.id
      },
      userRoleIds,
      params: {}
    });
  }
}
