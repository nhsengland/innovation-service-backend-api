import type { Context } from '@azure/functions';
import { InnovationCollaboratorStatusEnum, ServiceRoleEnum, type NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import { manageCollaboratorsUrl } from '../../../_helpers/url.helper';
import { BaseHandler } from '../../base.handler';

export class CollaboratorUpdateHandler extends BaseHandler<
  NotifierTypeEnum.COLLABORATOR_UPDATE,
  | 'MC03_COLLABORATOR_UPDATE_CANCEL_INVITE'
  | 'MC04_COLLABORATOR_UPDATE_ACCEPTS_INVITE'
  | 'MC05_COLLABORATOR_UPDATE_DECLINES_INVITE'
  | 'MC06_COLLABORATOR_UPDATE_REMOVED_COLLABORATOR'
  | 'MC07_COLLABORATOR_UPDATE_COLLABORATOR_LEFT_TO_INNOVATORS'
  | 'MC08_COLLABORATOR_UPDATE_COLLABORATOR_LEFT_TO_SELF'
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.COLLABORATOR_UPDATE],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);
    const requestUserName = await this.getRequestUserName();

    switch (this.inputData.collaborator.status) {
      case InnovationCollaboratorStatusEnum.CANCELLED:
        await this.MC03_COLLABORATOR_UPDATE_CANCEL_INVITE(innovation, requestUserName);
        break;
      case InnovationCollaboratorStatusEnum.REMOVED:
        await this.MC06_COLLABORATOR_UPDATE_REMOVED_COLLABORATOR(innovation, requestUserName);
        break;
      case InnovationCollaboratorStatusEnum.ACTIVE:
        await this.MC04_COLLABORATOR_UPDATE_ACCEPTS_INVITE(innovation, requestUserName);
        break;
      case InnovationCollaboratorStatusEnum.DECLINED:
        await this.MC05_COLLABORATOR_UPDATE_DECLINES_INVITE(innovation, requestUserName);
        break;
      case InnovationCollaboratorStatusEnum.LEFT:
        await this.MC07_COLLABORATOR_UPDATE_COLLABORATOR_LEFT_TO_INNOVATORS(innovation, requestUserName);
        await this.MC08_COLLABORATOR_UPDATE_COLLABORATOR_LEFT_TO_SELF(innovation);
        break;
    }

    return this;
  }

  private async MC03_COLLABORATOR_UPDATE_CANCEL_INVITE(
    innovation: { id: string; name: string; ownerId?: string },
    requestUserName: string
  ): Promise<void> {
    const collaborator = await this.recipientsService.innovationCollaborationInfo(this.inputData.collaborator.id);
    const recipient = await this.recipientsService.getUsersRecipient(collaborator.userId, ServiceRoleEnum.INNOVATOR);

    if (collaborator.userId && recipient) {
      this.notify('MC03_COLLABORATOR_UPDATE_CANCEL_INVITE', [recipient], {
        email: {
          notificationPreferenceType: 'INNOVATION_MANAGEMENT',
          params: { innovation_name: innovation.name, innovator_name: requestUserName }
        },
        inApp: {
          context: {
            id: collaborator.collaboratorId,
            type: 'INNOVATION_MANAGEMENT',
            detail: 'MC03_COLLABORATOR_UPDATE_CANCEL_INVITE'
          },
          innovationId: innovation.id,
          params: {
            collaboratorId: collaborator.collaboratorId,
            innovationName: innovation.name,
            requestUserName: requestUserName
          }
        }
      });
    } else {
      this.addEmails('MC03_COLLABORATOR_UPDATE_CANCEL_INVITE', [{ email: collaborator.email }], {
        notificationPreferenceType: 'INNOVATION_MANAGEMENT',
        params: { innovation_name: innovation.name, innovator_name: requestUserName }
      });
    }
  }

  private async MC04_COLLABORATOR_UPDATE_ACCEPTS_INVITE(
    innovation: { id: string; name: string; ownerId?: string },
    requestUserName: string
  ): Promise<void> {
    const owner = await this.recipientsService.getUsersRecipient(innovation.ownerId, ServiceRoleEnum.INNOVATOR);

    if (owner) {
      this.notify('MC04_COLLABORATOR_UPDATE_ACCEPTS_INVITE', [owner], {
        email: {
          notificationPreferenceType: 'INNOVATION_MANAGEMENT',
          params: {
            innovation_name: innovation.name,
            innovator_name: requestUserName,
            manage_collaborators_url: manageCollaboratorsUrl(innovation.id)
          }
        },
        inApp: {
          context: {
            id: this.inputData.collaborator.id,
            type: 'INNOVATION_MANAGEMENT',
            detail: 'MC04_COLLABORATOR_UPDATE_ACCEPTS_INVITE'
          },
          innovationId: innovation.id,
          params: {
            collaboratorId: this.inputData.collaborator.id,
            innovationName: innovation.name,
            requestUserName: requestUserName
          }
        }
      });
    }
  }

  private async MC05_COLLABORATOR_UPDATE_DECLINES_INVITE(
    innovation: { id: string; name: string; ownerId?: string },
    requestUserName: string
  ): Promise<void> {
    const owner = await this.recipientsService.getUsersRecipient(innovation.ownerId, ServiceRoleEnum.INNOVATOR);

    if (owner) {
      this.notify('MC05_COLLABORATOR_UPDATE_DECLINES_INVITE', [owner], {
        email: {
          notificationPreferenceType: 'INNOVATION_MANAGEMENT',
          params: {
            innovation_name: innovation.name,
            innovator_name: requestUserName,
            manage_collaborators_url: manageCollaboratorsUrl(innovation.id)
          }
        },
        inApp: {
          context: {
            id: this.inputData.collaborator.id,
            type: 'INNOVATION_MANAGEMENT',
            detail: 'MC05_COLLABORATOR_UPDATE_DECLINES_INVITE'
          },
          innovationId: innovation.id,
          params: {
            collaboratorId: this.inputData.collaborator.id,
            innovationName: innovation.name,
            requestUserName: requestUserName
          }
        }
      });
    }
  }

  private async MC06_COLLABORATOR_UPDATE_REMOVED_COLLABORATOR(
    innovation: { id: string; name: string; ownerId?: string },
    requestUserName: string
  ): Promise<void> {
    const collaborator = await this.recipientsService.innovationCollaborationInfo(this.inputData.collaborator.id);
    const recipient = await this.recipientsService.getUsersRecipient(collaborator.userId, ServiceRoleEnum.INNOVATOR);

    if (recipient) {
      this.notify('MC06_COLLABORATOR_UPDATE_REMOVED_COLLABORATOR', [recipient], {
        email: {
          notificationPreferenceType: 'INNOVATION_MANAGEMENT',
          params: { innovation_name: innovation.name, innovator_name: requestUserName }
        },
        inApp: {
          context: {
            id: this.inputData.collaborator.id,
            type: 'INNOVATION_MANAGEMENT',
            detail: 'MC06_COLLABORATOR_UPDATE_REMOVED_COLLABORATOR'
          },
          innovationId: innovation.id,
          params: {
            collaboratorId: this.inputData.collaborator.id,
            innovationName: innovation.name,
            requestUserName: requestUserName
          }
        }
      });
    }
  }

  private async MC07_COLLABORATOR_UPDATE_COLLABORATOR_LEFT_TO_INNOVATORS(
    innovation: { id: string; name: string; ownerId?: string },
    requestUserName: string
  ): Promise<void> {
    const innovators = await this.recipientsService.getInnovationActiveOwnerAndCollaborators(innovation.id);
    const recipients = await this.recipientsService.getUsersRecipient(innovators, ServiceRoleEnum.INNOVATOR);

    this.notify('MC07_COLLABORATOR_UPDATE_COLLABORATOR_LEFT_TO_INNOVATORS', recipients, {
      email: {
        notificationPreferenceType: 'INNOVATION_MANAGEMENT',
        params: {
          innovation_name: innovation.name,
          innovator_name: requestUserName,
          manage_collaborators_url: manageCollaboratorsUrl(innovation.id)
        }
      },
      inApp: {
        context: {
          id: this.inputData.collaborator.id,
          type: 'INNOVATION_MANAGEMENT',
          detail: 'MC07_COLLABORATOR_UPDATE_COLLABORATOR_LEFT_TO_INNOVATORS'
        },
        innovationId: innovation.id,
        params: {
          collaboratorId: this.inputData.collaborator.id,
          innovationName: innovation.name,
          requestUserName: requestUserName
        }
      }
    });
  }

  private async MC08_COLLABORATOR_UPDATE_COLLABORATOR_LEFT_TO_SELF(innovation: {
    id: string;
    name: string;
    ownerId?: string;
  }): Promise<void> {
    const collaborator = await this.recipientsService.getUsersRecipient(this.requestUser.id, ServiceRoleEnum.INNOVATOR);

    if (collaborator) {
      this.notify('MC08_COLLABORATOR_UPDATE_COLLABORATOR_LEFT_TO_SELF', [collaborator], {
        email: {
          notificationPreferenceType: 'INNOVATION_MANAGEMENT',
          params: { innovation_name: innovation.name },
          options: { includeSelf: true }
        },
        inApp: {
          context: {
            id: this.inputData.collaborator.id,
            type: 'INNOVATION_MANAGEMENT',
            detail: 'MC08_COLLABORATOR_UPDATE_COLLABORATOR_LEFT_TO_SELF'
          },
          innovationId: innovation.id,
          params: {
            collaboratorId: this.inputData.collaborator.id,
            innovationName: innovation.name
          },
          options: { includeSelf: true }
        }
      });
    }
  }
}
