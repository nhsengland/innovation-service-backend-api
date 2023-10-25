import type { NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { EmailTypeEnum, ENV } from '../_config';

import type { Context } from '@azure/functions';
import { UrlModel } from '@notifications/shared/models';
import { BaseHandler } from './base.handler';

export class InnovationDelayedSharedSuggestionHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_DELAYED_SHARE,
  EmailTypeEnum.OS03_INNOVATION_DELAYED_SHARED_SUGGESTION,
  never
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

    for (const recipient of recipients) {
      this.emails.push({
        templateId: EmailTypeEnum.OS03_INNOVATION_DELAYED_SHARED_SUGGESTION,
        to: recipient,
        notificationPreferenceType: null,
        params: {
          innovation_name: innovation.name,
          innovation_overview_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('accessor/innovations/:innovationId/overview')
            .setPathParams({
              innovationId: this.inputData.innovationId
            })
            .buildUrl()
        }
      });
    }

    return this;
  }
}
