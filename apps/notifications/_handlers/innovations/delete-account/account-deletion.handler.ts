import type { Context } from '@azure/functions';
import { ServiceRoleEnum, type NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import { innovationOverviewUrl } from '../../../_helpers/url.helper';
import { BaseHandler } from '../../base.handler';
import { randomUUID } from 'crypto';

export class AccountDeletionHandler extends BaseHandler<
  NotifierTypeEnum.ACCOUNT_DELETION,
  | 'DA01_OWNER_DELETED_ACCOUNT_WITH_PENDING_TRANSFER_TO_COLLABORATOR'
  | 'DA02_OWNER_DELETED_ACCOUNT_WITHOUT_PENDING_TRANSFER_TO_COLLABORATOR'
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.ACCOUNT_DELETION],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    for (const innovation of this.inputData.innovations) {
      if (innovation.transferExpireDate) {
        await this.DA01_OWNER_DELETED_ACCOUNT_WITH_PENDING_TRANSFER_TO_COLLABORATOR(innovation);
      } else if (innovation.affectedUsers) {
        await this.DA02_OWNER_DELETED_ACCOUNT_WITHOUT_PENDING_TRANSFER_TO_COLLABORATOR(innovation);
      }
    }
    return this;
  }

  private async DA01_OWNER_DELETED_ACCOUNT_WITH_PENDING_TRANSFER_TO_COLLABORATOR(
    innovation: NotifierTemplatesType[NotifierTypeEnum.ACCOUNT_DELETION]['innovations'][number]
  ): Promise<void> {
    const collaborators = await this.recipientsService.getInnovationActiveCollaborators(innovation.id);
    const innovationInfo = await this.recipientsService.innovationInfo(innovation.id);

    if (collaborators.length > 0) {
      const recipients = await this.recipientsService.getUsersRecipient(collaborators, ServiceRoleEnum.INNOVATOR);
      const notificationId = randomUUID();

      this.notify('DA01_OWNER_DELETED_ACCOUNT_WITH_PENDING_TRANSFER_TO_COLLABORATOR', recipients, {
        email: {
          notificationPreferenceType: null,
          params: {
            expiry_date: innovation.transferExpireDate ?? '',
            innovation_name: innovationInfo.name,
            innovation_overview_url: innovationOverviewUrl(ServiceRoleEnum.INNOVATOR, innovation.id, notificationId)
          }
        },
        inApp: {
          context: {
            id: this.requestUser.id,
            type: 'INNOVATION_MANAGEMENT',
            detail: 'DA01_OWNER_DELETED_ACCOUNT_WITH_PENDING_TRANSFER_TO_COLLABORATOR'
          },
          innovationId: innovation.id,
          params: { innovationName: innovationInfo.name },
          notificationId
        }
      });
    }
  }

  private async DA02_OWNER_DELETED_ACCOUNT_WITHOUT_PENDING_TRANSFER_TO_COLLABORATOR(
    innovation: NotifierTemplatesType[NotifierTypeEnum.ACCOUNT_DELETION]['innovations'][number]
  ): Promise<void> {
    const collaborators = innovation.affectedUsers ?? [];
    const innovationInfo = await this.recipientsService.innovationInfo(innovation.id);

    if (collaborators.length > 0) {
      const recipients = await this.recipientsService.usersBagToRecipients(
        collaborators.map(u => ({
          id: u.userId,
          userType: u.userType,
          organisationUnit: u.unitId
        }))
      );
      const notificationId = randomUUID();

      this.notify('DA02_OWNER_DELETED_ACCOUNT_WITHOUT_PENDING_TRANSFER_TO_COLLABORATOR', recipients, {
        email: {
          notificationPreferenceType: null,
          params: {
            innovation_name: innovationInfo.name
          }
        },
        inApp: {
          context: {
            id: this.requestUser.id,
            type: 'INNOVATION_MANAGEMENT',
            detail: 'DA02_OWNER_DELETED_ACCOUNT_WITHOUT_PENDING_TRANSFER_TO_COLLABORATOR'
          },
          innovationId: innovation.id,
          params: { innovationName: innovationInfo.name },
          notificationId
        }
      });
    }
  }
}
