import type { Context } from '@azure/functions';
import type { NotifierTypeEnum } from '@notifications/shared/enums';
import { ServiceRoleEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import { collaboratorInfoUrl, createAccountUrl } from '../../../_helpers/url.helper';
import { BaseHandler } from '../../base.handler';
import { randomUUID } from 'crypto';

export class CollaboratorInviteHandler extends BaseHandler<
  NotifierTypeEnum.COLLABORATOR_INVITE,
  'MC01_COLLABORATOR_INVITE_EXISTING_USER' | 'MC02_COLLABORATOR_INVITE_NEW_USER'
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.COLLABORATOR_INVITE],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const collaborator = await this.recipientsService.innovationCollaborationInfo(this.inputData.collaboratorId);
    const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);
    if (collaborator.userId) {
      await this.MC01_COLLABORATOR_INVITE_EXISTING_USER(innovation, {
        id: collaborator.collaboratorId,
        userId: collaborator.userId
      });
    } else {
      await this.MC02_COLLABORATOR_INVITE_NEW_USER(innovation, collaborator.email);
    }

    return this;
  }

  private async MC01_COLLABORATOR_INVITE_EXISTING_USER(
    innovation: { id: string; name: string },
    collaborator: { id: string; userId: string }
  ): Promise<void> {
    const recipient = await this.recipientsService.getUsersRecipient(collaborator.userId, ServiceRoleEnum.INNOVATOR);
    if (recipient) {
      const requestUserName = await this.getRequestUserName();
      const notificationId = randomUUID();

      this.notify('MC01_COLLABORATOR_INVITE_EXISTING_USER', [recipient], {
        email: {
          notificationPreferenceType: 'INNOVATION_MANAGEMENT',
          params: {
            innovation_name: innovation.name,
            innovator_name: requestUserName,
            invitation_url: collaboratorInfoUrl(
              ServiceRoleEnum.INNOVATOR,
              innovation.id,
              collaborator.id,
              notificationId
            )
          }
        },
        inApp: {
          context: {
            id: collaborator.id,
            type: 'INNOVATION_MANAGEMENT',
            detail: 'MC01_COLLABORATOR_INVITE_EXISTING_USER'
          },
          innovationId: innovation.id,
          params: {
            innovationName: innovation.name,
            requestUserName: requestUserName,
            collaboratorId: collaborator.id
          },
          notificationId
        }
      });
    }
  }

  private async MC02_COLLABORATOR_INVITE_NEW_USER(
    innovation: { id: string; name: string },
    collaboratorEmail: string
  ): Promise<void> {
    this.addEmails('MC02_COLLABORATOR_INVITE_NEW_USER', [{ email: collaboratorEmail }], {
      notificationPreferenceType: 'INNOVATION_MANAGEMENT',
      params: {
        innovation_name: innovation.name,
        innovator_name: await this.getRequestUserName(),
        create_account_url: createAccountUrl()
      }
    });
  }
}
