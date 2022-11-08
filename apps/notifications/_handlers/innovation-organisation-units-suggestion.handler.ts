import type { NotifierTypeEnum, UserTypeEnum } from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import type { NotifierTemplatesType } from '@notifications/shared/types';

import { container, ENV } from '../_config';
import { EmailTypeEnum } from '../_config/emails.config';
import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';

import { BaseHandler } from './base.handler';


export class InnovationOrganisationUnitsSuggestionHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_ORGANISATION_UNITS_SUGGESTION,
  EmailTypeEnum.ORGANISATION_SUGGESTION_TO_QA,
  Record<string, never>
> {

  private recipientsService = container.get<RecipientsServiceType>(RecipientsServiceSymbol);

  constructor(
    requestUser: { id: string, identityId: string, type: UserTypeEnum },
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_ORGANISATION_UNITS_SUGGESTION]
  ) {
    super(requestUser, data);
  }


  async run(): Promise<this> {

    const suggestedOrganisationUnitsUsers = await this.recipientsService.organisationUnitsQualifyingAccessors(this.inputData.organisationUnitIds);

    for (const user of suggestedOrganisationUnitsUsers) {
      this.emails.push({
        templateId: EmailTypeEnum.ORGANISATION_SUGGESTION_TO_QA,
        to: { type: 'identityId', value: user.identityId, displayNameParam: 'display_name' },
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
