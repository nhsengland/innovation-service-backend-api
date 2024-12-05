import { ServiceRoleEnum, type NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import type { Context } from '@azure/functions';
import { innovationOverviewUrl } from '../../_helpers/url.helper';
import { BaseHandler } from '../base.handler';
import { randomUUID } from 'crypto';

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
    const notificationId = randomUUID();

    this.notify('OS03_INNOVATION_DELAYED_SHARED_SUGGESTION', recipients, {
      email: {
        notificationPreferenceType: 'ORGANISATION_SUGGESTIONS',
        params: {
          innovation_name: innovation.name,
          innovation_overview_url: innovationOverviewUrl(
            ServiceRoleEnum.ACCESSOR,
            this.inputData.innovationId,
            notificationId
          )
        }
      },
      inApp: {
        innovationId: innovation.id,
        context: {
          type: 'ORGANISATION_SUGGESTIONS',
          id: innovation.id,
          detail: 'OS03_INNOVATION_DELAYED_SHARED_SUGGESTION'
        },
        params: { innovationName: innovation.name },
        notificationId
      }
    });

    return this;
  }
}
