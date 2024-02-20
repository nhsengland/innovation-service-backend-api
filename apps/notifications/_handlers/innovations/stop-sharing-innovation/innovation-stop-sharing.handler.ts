import type { Context } from '@azure/functions';
import { ServiceRoleEnum, type NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import { dataSharingPreferencesUrl } from '../../../_helpers/url.helper';
import { BaseHandler } from '../../base.handler';

export class InnovationStopSharingHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_STOP_SHARING,
  | 'SH04_INNOVATION_STOPPED_SHARING_WITH_INDIVIDUAL_ORG_TO_OWNER'
  | 'SH05_INNOVATION_STOPPED_SHARING_WITH_INDIVIDUAL_ORG_TO_QA_A'
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_STOP_SHARING],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);

    // Always send a "receipt" to the owner
    if (innovation.ownerId) {
      await this.SH04_INNOVATION_STOPPED_SHARING_WITH_INDIVIDUAL_ORG_TO_OWNER(innovation);
    }

    if (this.inputData.affectedUsers) {
      await this.SH05_INNOVATION_STOPPED_SHARING_WITH_INDIVIDUAL_ORG_TO_QA_A(innovation);
    }

    return this;
  }

  private async SH04_INNOVATION_STOPPED_SHARING_WITH_INDIVIDUAL_ORG_TO_OWNER(innovation: {
    id: string;
    name: string;
    ownerId?: string;
  }): Promise<void> {
    const recipient = await this.recipientsService.getUsersRecipient(innovation.ownerId, ServiceRoleEnum.INNOVATOR);
    if (!recipient) {
      return;
    }
    const organisationInfo = await this.recipientsService.organisationInfo(this.inputData?.organisationId ?? '');

    this.notify('SH04_INNOVATION_STOPPED_SHARING_WITH_INDIVIDUAL_ORG_TO_OWNER', [recipient], {
      email: {
        notificationPreferenceType: 'INNOVATION_MANAGEMENT',
        params: {
          innovation_name: innovation.name,
          organisation_name: organisationInfo.name,
          data_sharing_preferences_url: dataSharingPreferencesUrl(ServiceRoleEnum.INNOVATOR, innovation.id)
        },
        options: { includeSelf: true }
      },
      inApp: {
        context: {
          id: innovation.id,
          type: 'INNOVATION_MANAGEMENT',
          detail: 'SH04_INNOVATION_STOPPED_SHARING_WITH_INDIVIDUAL_ORG_TO_OWNER'
        },
        innovationId: innovation.id,
        params: {
          innovationName: innovation.name,
          organisationName: organisationInfo.name
        },
        options: { includeSelf: true }
      }
    });
  }
  private async SH05_INNOVATION_STOPPED_SHARING_WITH_INDIVIDUAL_ORG_TO_QA_A(innovation: {
    id: string;
    name: string;
    ownerId?: string;
  }): Promise<void> {
    const assignedQAs = await this.recipientsService.getRecipientsByRoleId(this.inputData.affectedUsers?.roleIds ?? []);

    this.notify('SH05_INNOVATION_STOPPED_SHARING_WITH_INDIVIDUAL_ORG_TO_QA_A', assignedQAs, {
      email: {
        notificationPreferenceType: 'INNOVATION_MANAGEMENT',
        params: {
          innovation_name: innovation.name
        }
      },
      inApp: {
        context: {
          id: innovation.id,
          type: 'INNOVATION_MANAGEMENT',
          detail: 'SH05_INNOVATION_STOPPED_SHARING_WITH_INDIVIDUAL_ORG_TO_QA_A'
        },
        innovationId: innovation.id,
        params: {
          innovationName: innovation.name
        }
      }
    });
  }
}
