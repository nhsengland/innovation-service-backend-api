import type { NotifierTypeEnum } from '@notifications/shared/enums';
import { InnovationTransferStatusEnum, ServiceRoleEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import type { Context } from '@azure/functions';
import type { IdentityProviderService } from '@notifications/shared/services';
import SHARED_SYMBOLS from '@notifications/shared/services/symbols';
import { container } from '../../../_config';
import { manageInnovationUrl } from '../../../_helpers/url.helper';
import type { RecipientType } from '../../../_services/recipients.service';
import { BaseHandler } from '../../base.handler';
import { randomUUID } from 'crypto';

export class InnovationTransferOwnershipCompletedHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_COMPLETED,
  | 'TO06_TRANSFER_OWNERSHIP_ACCEPTS_PREVIOUS_OWNER'
  | 'TO07_TRANSFER_OWNERSHIP_ACCEPTS_ASSIGNED_ACCESSORS'
  | 'TO08_TRANSFER_OWNERSHIP_DECLINES_PREVIOUS_OWNER'
  | 'TO09_TRANSFER_OWNERSHIP_CANCELED_NEW_OWNER'
> {
  private identityProviderService = container.get<IdentityProviderService>(SHARED_SYMBOLS.IdentityProviderService);

  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_COMPLETED],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);
    const ownerInfo = await this.recipientsService.usersIdentityInfo(innovation.ownerIdentityId);
    const ownerName = ownerInfo?.displayName ?? (await this.getUserName(null, ServiceRoleEnum.INNOVATOR));
    const transfer = await this.recipientsService.innovationTransferInfoWithOwner(this.inputData.transferId);

    switch (transfer.status) {
      case InnovationTransferStatusEnum.COMPLETED: {
        const oldOwner = await this.recipientsService.getUsersRecipient(transfer.ownerId, ServiceRoleEnum.INNOVATOR);
        const oldOwnerName = await this.getUserName(oldOwner?.identityId, ServiceRoleEnum.INNOVATOR);
        if (oldOwner) {
          this.TO06_TRANSFER_OWNERSHIP_ACCEPTS_PREVIOUS_OWNER(innovation, oldOwner, ownerName);
        }
        await this.TO07_TRANSFER_OWNERSHIP_ACCEPTS_ASSIGNED_ACCESSORS(innovation, oldOwnerName, ownerName);

        break;
      }

      case InnovationTransferStatusEnum.CANCELED: {
        await this.TO09_TRANSFER_OWNERSHIP_CANCELED_NEW_OWNER(innovation, transfer.email, ownerName);
        break;
      }

      case InnovationTransferStatusEnum.DECLINED: {
        const oldOwner = await this.recipientsService.getUsersRecipient(transfer.ownerId, ServiceRoleEnum.INNOVATOR);
        if (oldOwner) {
          await this.TO08_TRANSFER_OWNERSHIP_DECLINES_PREVIOUS_OWNER(innovation, oldOwner, transfer.email);
        }
        break;
      }
      default:
        break;
    }

    return this;
  }

  private TO06_TRANSFER_OWNERSHIP_ACCEPTS_PREVIOUS_OWNER(
    innovation: { id: string; name: string },
    oldOwner: RecipientType,
    newOwner: string
  ): void {
    const notificationId = randomUUID();

    this.notify('TO06_TRANSFER_OWNERSHIP_ACCEPTS_PREVIOUS_OWNER', [oldOwner], {
      email: {
        notificationPreferenceType: 'INNOVATION_MANAGEMENT',
        params: {
          innovation_name: innovation.name,
          new_innovation_owner: newOwner
        }
      },
      inApp: {
        context: {
          detail: 'TO06_TRANSFER_OWNERSHIP_ACCEPTS_PREVIOUS_OWNER',
          id: this.inputData.transferId,
          type: 'INNOVATION_MANAGEMENT'
        },
        innovationId: innovation.id,
        params: {
          innovationName: innovation.name,
          newInnovationOwner: newOwner
        },
        notificationId
      }
    });
  }

  private async TO07_TRANSFER_OWNERSHIP_ACCEPTS_ASSIGNED_ACCESSORS(
    innovation: { id: string; name: string },
    oldOwner: string,
    newOwner: string
  ): Promise<void> {
    const assignedQAs = await this.recipientsService.innovationAssignedRecipients(innovation.id, {});
    const notificationId = randomUUID();

    this.addInApp('TO07_TRANSFER_OWNERSHIP_ACCEPTS_ASSIGNED_ACCESSORS', assignedQAs, {
      context: {
        detail: 'TO07_TRANSFER_OWNERSHIP_ACCEPTS_ASSIGNED_ACCESSORS',
        id: this.inputData.transferId,
        type: 'INNOVATION_MANAGEMENT'
      },
      innovationId: innovation.id,
      params: {
        innovationName: innovation.name,
        newInnovationOwnerName: newOwner,
        oldInnovationOwnerName: oldOwner
      },
      notificationId
    });
  }

  private async TO08_TRANSFER_OWNERSHIP_DECLINES_PREVIOUS_OWNER(
    innovation: { id: string; name: string },
    owner: RecipientType,
    targetEmail: string
  ): Promise<void> {
    const targetIdentity = await this.identityProviderService.getUserInfoByEmail(targetEmail);
    const newOwner = await this.getUserName(targetIdentity?.identityId, ServiceRoleEnum.INNOVATOR);
    const notificationId = randomUUID();

    this.notify('TO08_TRANSFER_OWNERSHIP_DECLINES_PREVIOUS_OWNER', [owner], {
      email: {
        notificationPreferenceType: 'INNOVATION_MANAGEMENT',
        params: {
          innovation_name: innovation.name,
          manage_innovation_url: manageInnovationUrl(ServiceRoleEnum.INNOVATOR, innovation.id, notificationId),
          new_innovation_owner: newOwner
        }
      },
      inApp: {
        context: {
          detail: 'TO08_TRANSFER_OWNERSHIP_DECLINES_PREVIOUS_OWNER',
          id: this.inputData.transferId,
          type: 'INNOVATION_MANAGEMENT'
        },
        innovationId: innovation.id,
        params: {
          innovationName: innovation.name
        },
        notificationId
      }
    });
  }

  private async TO09_TRANSFER_OWNERSHIP_CANCELED_NEW_OWNER(
    innovation: { id: string; name: string },
    targetEmail: string,
    oldOwnerName: string
  ): Promise<void> {
    const targetIdentity = await this.identityProviderService.getUserInfoByEmail(targetEmail);
    const targetUser = targetIdentity
      ? await this.recipientsService.identityId2UserId(targetIdentity.identityId)
      : null;
    const recipient = await this.recipientsService.getUsersRecipient(targetUser, ServiceRoleEnum.INNOVATOR);

    if (recipient) {
      const notificationId = randomUUID();

      this.notify('TO09_TRANSFER_OWNERSHIP_CANCELED_NEW_OWNER', [recipient], {
        email: {
          notificationPreferenceType: 'INNOVATION_MANAGEMENT',
          params: {
            innovation_name: innovation.name,
            innovator_name: oldOwnerName
          }
        },
        inApp: {
          context: {
            detail: 'TO09_TRANSFER_OWNERSHIP_CANCELED_NEW_OWNER',
            id: this.inputData.transferId,
            type: 'INNOVATION_MANAGEMENT'
          },
          innovationId: innovation.id,
          params: {
            innovationName: innovation.name,
            innovationOwner: oldOwnerName
          },
          notificationId
        }
      });
    } else {
      this.addEmails('TO09_TRANSFER_OWNERSHIP_CANCELED_NEW_OWNER', [{ email: targetEmail }], {
        notificationPreferenceType: 'INNOVATION_MANAGEMENT',
        params: {
          innovation_name: innovation.name,
          innovator_name: oldOwnerName
        }
      });
    }
  }
}
