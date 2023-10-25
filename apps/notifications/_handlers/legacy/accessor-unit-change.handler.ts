import { NotifierTypeEnum, ServiceRoleEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import type { Context } from '@azure/functions';
import { NotFoundError, UserErrorsEnum } from '@notifications/shared/errors';
import { BaseHandler } from '../base.handler';

// REVIEW this isn't used
export class AccessorUnitChangeHandler extends BaseHandler<NotifierTypeEnum.ACCESSOR_UNIT_CHANGE, 'MIGRATION_OLD'> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.ACCESSOR_UNIT_CHANGE],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const userInfo = await this.recipientsService.getUsersRecipient(
      this.inputData.user.id,
      [ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR],
      { organisationUnit: this.inputData.newOrganisationUnitId }
    );
    const userIdentityInfo = await this.recipientsService.usersIdentityInfo(this.inputData.user.identityId);

    if (!userInfo || !userIdentityInfo) {
      throw new NotFoundError(UserErrorsEnum.USER_ROLE_NOT_FOUND);
    }

    const oldUnitInfo = await this.recipientsService.organisationUnitInfo(this.inputData.oldOrganisationUnitId);
    const newUnitInfo = await this.recipientsService.organisationUnitInfo(this.inputData.newOrganisationUnitId);

    const oldUnitQAs = await this.recipientsService.organisationUnitsQualifyingAccessors([
      this.inputData.oldOrganisationUnitId
    ]);
    const newUnitQAs = (
      await this.recipientsService.organisationUnitsQualifyingAccessors([this.inputData.newOrganisationUnitId])
    ).filter(item => item.userId !== this.inputData.user.id); // Exclude moved user from new unit QAs.

    // E-mail to the user (accessor) that moved.
    this.emails.push({
      templateId: 'ACCESSOR_UNIT_CHANGE_TO_USER_MOVED',
      to: userInfo,
      notificationPreferenceType: null,
      params: {
        old_organisation: oldUnitInfo.organisation.name,
        old_unit: oldUnitInfo.organisationUnit.name,
        new_organisation: newUnitInfo.organisation.name,
        new_unit: newUnitInfo.organisationUnit.name
      }
    });

    // E-mail to old unit QAs.
    for (const user of oldUnitQAs) {
      this.emails.push({
        templateId: 'ACCESSOR_UNIT_CHANGE_TO_QA_OLD_UNIT',
        to: user,
        notificationPreferenceType: null,
        params: {
          user_name: userIdentityInfo.displayName,
          old_unit: oldUnitInfo.organisationUnit.name
        }
      });
    }

    // E-mail to new unit QAs.
    for (const user of newUnitQAs) {
      this.emails.push({
        templateId: 'ACCESSOR_UNIT_CHANGE_TO_QA_NEW_UNIT',
        to: user,
        notificationPreferenceType: null,
        params: {
          user_name: userIdentityInfo.displayName,
          new_unit: newUnitInfo.organisationUnit.name
        }
      });
    }

    return this;
  }
}