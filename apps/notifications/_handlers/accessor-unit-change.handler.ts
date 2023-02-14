import type { NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { container, EmailTypeEnum } from '../_config';
import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';

import { BaseHandler } from './base.handler';


export class AccessorUnitChangeHandler extends BaseHandler<
  NotifierTypeEnum.ACCESSOR_UNIT_CHANGE,
  EmailTypeEnum.ACCESSOR_UNIT_CHANGE_TO_USER_MOVED | EmailTypeEnum.ACCESSOR_UNIT_CHANGE_TO_QA_OLD_UNIT | EmailTypeEnum.ACCESSOR_UNIT_CHANGE_TO_QA_NEW_UNIT,
  Record<string, never>
> {

  private recipientsService = container.get<RecipientsServiceType>(RecipientsServiceSymbol);

  constructor(
    requestUser: { id: string, identityId: string },
    domainContext: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.ACCESSOR_UNIT_CHANGE]
  ) {
    super(requestUser, data, domainContext);
  }


  async run(): Promise<this> {

    const userInfo = await this.recipientsService.userInfo(this.inputData.user.id);

    const oldUnitInfo = await this.recipientsService.organisationUnitInfo(this.inputData.oldOrganisationUnitId);
    const newUnitInfo = await this.recipientsService.organisationUnitInfo(this.inputData.newOrganisationUnitId);

    const oldUnitQAs = await this.recipientsService.organisationUnitsQualifyingAccessors([this.inputData.oldOrganisationUnitId]);
    const newUnitQAs = (await this.recipientsService.organisationUnitsQualifyingAccessors([this.inputData.newOrganisationUnitId]))
      .filter(item => item.id !== this.inputData.user.id); // Exclude moved user from new unit QAs.

    // E-mail to the user (accessor) that moved.
    this.emails.push({
      templateId: EmailTypeEnum.ACCESSOR_UNIT_CHANGE_TO_USER_MOVED,
      to: { type: 'identityId', value: userInfo.identityId, displayNameParam: 'display_name' },
      params: {
        // display_name: '', // This will be filled by the email-listener function.
        old_organisation: oldUnitInfo.organisation.name,
        old_unit: oldUnitInfo.organisationUnit.name,
        new_organisation: newUnitInfo.organisation.name,
        new_unit: newUnitInfo.organisationUnit.name
      }
    });

    // E-mail to old unit QAs.
    for (const user of oldUnitQAs) {
      this.emails.push({
        templateId: EmailTypeEnum.ACCESSOR_UNIT_CHANGE_TO_QA_OLD_UNIT,
        to: { type: 'identityId', value: user.identityId, displayNameParam: 'display_name' },
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          user_name: userInfo.name,
          old_unit: oldUnitInfo.organisationUnit.name
        }
      });
    }

    // E-mail to new unit QAs.
    for (const user of newUnitQAs) {
      this.emails.push({
        templateId: EmailTypeEnum.ACCESSOR_UNIT_CHANGE_TO_QA_NEW_UNIT,
        to: { type: 'identityId', value: user.identityId, displayNameParam: 'display_name' },
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          user_name: userInfo.name,
          new_unit: newUnitInfo.organisationUnit.name
        }
      });
    }

    return this;

  }

}
