import type { NotifierTypeEnum} from '@notifications/shared/enums';
import { ServiceRoleEnum } from '@notifications/shared/enums';
import type { IdentityProviderService } from '@notifications/shared/services';
import SHARED_SYMBOLS from '@notifications/shared/services/symbols';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import type { Context } from '@azure/functions';
import { container } from '../../../_config';
import { createAccountUrl, dashboardUrl } from '../../../_helpers/url.helper';
import { BaseHandler } from '../../base.handler';

export class InnovationTransferOwnershipCreationHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_CREATION,
  'TO01_TRANSFER_OWNERSHIP_NEW_USER' | 'TO02_TRANSFER_OWNERSHIP_EXISTING_USER'
> {
  private identityProviderService = container.get<IdentityProviderService>(SHARED_SYMBOLS.IdentityProviderService);

  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_CREATION],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);
    const previousOwner = await this.getUserName(innovation.ownerIdentityId, ServiceRoleEnum.INNOVATOR);
    const transfer = await this.recipientsService.innovationTransferInfoWithOwner(this.inputData.transferId);

    const targetUser = await this.identityProviderService.getUserInfoByEmail(transfer.email);

    if (!targetUser) {
      // This means that the user is NOT registered in the service.
      this.TO01_TRANSFER_OWNERSHIP_NEW_USER(innovation.name, previousOwner, transfer.email);
    } else {
      await this.TO02_TRANSFER_OWNERSHIP_EXISTING_USER(
        { name: innovation.name, id: innovation.id },
        previousOwner,
        targetUser.identityId
      );
    }

    return this;
  }

  private TO01_TRANSFER_OWNERSHIP_NEW_USER(innovationName: string, previousOwner: string, newUserEmail: string): void {
    this.addEmails('TO01_TRANSFER_OWNERSHIP_NEW_USER', [{ email: newUserEmail }], {
      notificationPreferenceType: 'INNOVATION_MANAGEMENT',
      params: {
        create_account_url: createAccountUrl(),
        innovation_name: innovationName,
        innovator_name: previousOwner
      }
    });
  }

  private async TO02_TRANSFER_OWNERSHIP_EXISTING_USER(
    innovation: { name: string; id: string },
    previousOwner: string,
    newOwnerIdentityId: string
  ): Promise<void> {
    const recipientId = await this.recipientsService.identityId2UserId(newOwnerIdentityId);
    const recipient = await this.recipientsService.getUsersRecipient(recipientId, ServiceRoleEnum.INNOVATOR);
    if (recipient) {
      this.notify('TO02_TRANSFER_OWNERSHIP_EXISTING_USER', [recipient], {
        email: {
          notificationPreferenceType: 'INNOVATION_MANAGEMENT',
          params: {
            dashboard_url: dashboardUrl(ServiceRoleEnum.INNOVATOR),
            innovation_name: innovation.name,
            innovator_name: previousOwner
          }
        },
        inApp: {
          context: {
            detail: 'TO02_TRANSFER_OWNERSHIP_EXISTING_USER',
            id: this.inputData.transferId,
            type: 'INNOVATION_MANAGEMENT'
          },
          innovationId: innovation.id,
          params: {
            innovationName: innovation.name,
            transferId: this.inputData.transferId
          }
        }
      });
    }
  }
}
