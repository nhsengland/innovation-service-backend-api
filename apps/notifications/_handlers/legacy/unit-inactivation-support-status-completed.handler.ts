import { NotifierTypeEnum, ServiceRoleEnum } from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { ENV } from '../../_config';

import type { Context } from '@azure/functions';
import { BaseHandler } from '../base.handler';

export class UnitInactivationSupportStatusCompletedHandler extends BaseHandler<
  NotifierTypeEnum.UNIT_INACTIVATION_SUPPORT_COMPLETED,
  'MIGRATION_OLD'
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.UNIT_INACTIVATION_SUPPORT_COMPLETED],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);
    const innovator = await this.recipientsService.getUsersRecipient(innovation.ownerId, ServiceRoleEnum.INNOVATOR);

    if (innovator) {
      const unitInfo = await this.recipientsService.organisationUnitInfo(this.inputData.unitId);

      this.emails.push({
        templateId: 'UNIT_INACTIVATION_SUPPORT_COMPLETED',
        to: innovator,
        notificationPreferenceType: null,
        params: {
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