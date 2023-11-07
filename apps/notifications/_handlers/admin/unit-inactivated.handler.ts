import type { Context } from '@azure/functions';
import { NotificationCategoryEnum, ServiceRoleEnum, type NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import { dataSharingPreferencesUrl } from '../../_helpers/url.helper';
import { BaseHandler } from '../base.handler';

export class UnitInactivatedHandler extends BaseHandler<
  NotifierTypeEnum.UNIT_INACTIVATED,
  'AP07_UNIT_INACTIVATED_TO_ENGAGING_INNOVATIONS'
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.UNIT_INACTIVATED],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    if (this.inputData.completedInnovationIds.length > 0) {
      await this.AP07_UNIT_INACTIVATED_TO_ENGAGING_INNOVATIONS();
    }
    return this;
  }

  private async AP07_UNIT_INACTIVATED_TO_ENGAGING_INNOVATIONS(): Promise<void> {
    const unitInfo = await this.recipientsService.organisationUnitInfo(this.inputData.unitId);
    const innovations = await this.recipientsService.getInnovationsInfo(this.inputData.completedInnovationIds);

    const ownerIds = Array.from(innovations.values())
      .filter(i => i.ownerId !== undefined)
      .map(i => i.ownerId as string);
    const recipients = await this.recipientsService.getUsersRecipient(ownerIds, ServiceRoleEnum.INNOVATOR);

    for (const innovation of innovations.values()) {
      const owner = recipients.find(r => r.userId === innovation.ownerId);
      if (owner) {
        this.notify('AP07_UNIT_INACTIVATED_TO_ENGAGING_INNOVATIONS', [owner], {
          email: {
            notificationPreferenceType: NotificationCategoryEnum.ADMIN,
            params: {
              innovation_name: innovation.name,
              support_url: dataSharingPreferencesUrl(ServiceRoleEnum.INNOVATOR, innovation.id),
              unit_name: unitInfo.organisationUnit.name
            }
          },
          inApp: {
            context: {
              id: innovation.id,
              detail: 'AP07_UNIT_INACTIVATED_TO_ENGAGING_INNOVATIONS',
              type: NotificationCategoryEnum.ADMIN
            },
            innovationId: innovation.id,
            params: {
              innovationName: innovation.name,
              unitName: unitInfo.organisationUnit.name
            }
          }
        });
      }
    }
  }
}
