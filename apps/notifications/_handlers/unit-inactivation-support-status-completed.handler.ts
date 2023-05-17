import { InnovationSupportStatusEnum, NotifierTypeEnum, ServiceRoleEnum } from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { EmailTypeEnum, ENV } from '../_config';

import { BaseHandler } from './base.handler';

export class UnitInactivationSupportStatusCompletedHandler extends BaseHandler<
  NotifierTypeEnum.UNIT_INACTIVATION_SUPPORT_COMPLETED,
  EmailTypeEnum.UNIT_INACTIVATION_SUPPORT_COMPLETED,
  { organisationUnitName: string; supportStatus: InnovationSupportStatusEnum }
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.UNIT_INACTIVATION_SUPPORT_COMPLETED],
  ) {
    super(requestUser, data);
  }

  async run(): Promise<this> {
    const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);
    const innovator = await this.recipientsService.getUsersRecipient(innovation.ownerId, ServiceRoleEnum.INNOVATOR);

    if (innovator) {
      const innovatorIdentity = await this.recipientsService.usersIdentityInfo(innovator.identityId);
      const unitInfo = await this.recipientsService.organisationUnitInfo(this.inputData.unitId);

      this.emails.push({
        templateId: EmailTypeEnum.UNIT_INACTIVATION_SUPPORT_COMPLETED,
        to: innovator,
        notificationPreferenceType: null,
        params: {
          display_name: innovatorIdentity?.displayName ?? 'user', // Review what should happen if user is not found
          innovation_name: innovation.name,
          unit_name: unitInfo.organisationUnit.name,
          support_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('innovator/innovations/:innovationId/support')
            .setPathParams({ innovationId: this.inputData.innovationId })
            .buildUrl()
        }
      });
    }

    return this;
  }
}
