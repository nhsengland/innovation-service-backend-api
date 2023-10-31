import { NotificationCategoryEnum, ServiceRoleEnum, type NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import type { Context } from '@azure/functions';
import { innovationOverviewUrl } from '../../_helpers/url.helper';
import { BaseHandler } from '../base.handler';

export class InnovationDelayedSharedSuggestionHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_DELAYED_SHARE,
  'OS03_INNOVATION_DELAYED_SHARED_SUGGESTION'
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_DELAYED_SHARE],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);

    const suggestedUnits = await this.recipientsService.getUnitSuggestionsByInnovation(this.inputData.innovationId);
    const unitsToNotify = suggestedUnits.filter(u => this.inputData.newSharedOrgIds.includes(u.orgId));

    const recipients = await this.recipientsService.organisationUnitsQualifyingAccessors(
      unitsToNotify.map(u => u.unitId)
    );

    this.notify('OS03_INNOVATION_DELAYED_SHARED_SUGGESTION', recipients, {
      email: {
        notificationPreferenceType: NotificationCategoryEnum.SUGGEST_SUPPORT,
        params: {
          innovation_name: innovation.name,
          innovation_overview_url: innovationOverviewUrl(ServiceRoleEnum.ACCESSOR, this.inputData.innovationId)
        }
      },
      inApp: {
        innovationId: innovation.id,
        context: {
          type: NotificationCategoryEnum.SUGGEST_SUPPORT,
          id: innovation.id, // TODO,
          detail: 'OS03_INNOVATION_DELAYED_SHARED_SUGGESTION'
        },
        params: {
          innovationName: innovation.name,
          innovationId: innovation.id
        }
      }
    });

    return this;
  }
}
