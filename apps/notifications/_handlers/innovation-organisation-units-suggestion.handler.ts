import type { NotifierTypeEnum } from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { ENV } from '../_config';
import { EmailTypeEnum } from '../_config/emails.config';

import { BaseHandler } from './base.handler';
import type { Context } from '@azure/functions';

export class InnovationOrganisationUnitsSuggestionHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_ORGANISATION_UNITS_SUGGESTION,
  EmailTypeEnum.ORGANISATION_SUGGESTION_TO_QA,
  Record<string, never>
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_ORGANISATION_UNITS_SUGGESTION],
    azureContext: Context
) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    // Retrieve innovation shared organisations units
    const sharedOrganisations = await this.recipientsService.innovationSharedOrganisationsWithUnits(
      this.inputData.innovationId
    );
    const sharedOrganisationUnitsIds = sharedOrganisations.flatMap(organisation =>
      organisation.organisationUnits.map(unit => unit.id)
    );

    const suggestedSharedOrganisationUnitsIds = sharedOrganisationUnitsIds.filter(id =>
      this.inputData.organisationUnitIds.includes(id)
    );
    const suggestedOrganisationUnitsUsers = await this.recipientsService.organisationUnitsQualifyingAccessors(
      suggestedSharedOrganisationUnitsIds
    );

    for (const user of suggestedOrganisationUnitsUsers) {
      this.emails.push({
        templateId: EmailTypeEnum.ORGANISATION_SUGGESTION_TO_QA,
        to: user,
        notificationPreferenceType: null,
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          innovation_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('accessor/innovations/:innovationId')
            .setPathParams({ innovationId: this.inputData.innovationId })
            .buildUrl()
        }
      });
    }

    return this;
  }
}
