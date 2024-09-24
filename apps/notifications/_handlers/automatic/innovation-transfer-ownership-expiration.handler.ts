import type { NotifierTypeEnum} from '@notifications/shared/enums';
import { ServiceRoleEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import type { Context } from '@azure/functions';
import { manageInnovationUrl } from '../../_helpers/url.helper';
import { BaseHandler } from '../base.handler';

export class InnovationTransferOwnershipExpirationHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_EXPIRATION,
  'AU09_TRANSFER_EXPIRED'
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_EXPIRATION],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId, true);

    if (!innovation.ownerId) {
      this.logger.error(
        `InnovationTransferOwnershipExpirationHandler: Innovation owner not found for for innovation ${this.inputData.innovationId}`
      );
      return this;
    }

    const targetUser = await this.recipientsService.getUsersRecipient(innovation.ownerId, ServiceRoleEnum.INNOVATOR);

    if (targetUser) {
      this.notify('AU09_TRANSFER_EXPIRED', [targetUser], {
        email: {
          notificationPreferenceType: 'AUTOMATIC',
          params: {
            innovation_name: innovation.name,
            manage_innovation_url: manageInnovationUrl(ServiceRoleEnum.INNOVATOR, this.inputData.innovationId)
          }
        },
        inApp: {
          context: {
            detail: 'AU09_TRANSFER_EXPIRED',
            id: this.inputData.innovationId,
            type: 'AUTOMATIC'
          },
          innovationId: this.inputData.innovationId,
          params: {
            innovationName: innovation.name
          }
        }
      });
    }

    return this;
  }
}
