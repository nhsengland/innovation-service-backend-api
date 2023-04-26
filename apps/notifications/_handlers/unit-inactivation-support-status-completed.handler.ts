import type { InnovationSupportStatusEnum, NotifierTypeEnum } from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { container, EmailTypeEnum, ENV } from '../_config';
import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';

import { BaseHandler } from './base.handler';

export class UnitInactivationSupportStatusCompletedHandler extends BaseHandler<
  NotifierTypeEnum.UNIT_INACTIVATION_SUPPORT_COMPLETED,
  EmailTypeEnum.UNIT_INACTIVATION_SUPPORT_COMPLETED,
  { organisationUnitName: string; supportStatus: InnovationSupportStatusEnum }
> {
  private recipientsService = container.get<RecipientsServiceType>(RecipientsServiceSymbol);

  constructor(
    requestUser: { id: string; identityId: string },
    data: NotifierTemplatesType[NotifierTypeEnum.UNIT_INACTIVATION_SUPPORT_COMPLETED],
    domainContext: DomainContextType
  ) {
    super(requestUser, data, domainContext);
  }

  async run(): Promise<this> {
    const innovationInfo = await this.recipientsService.innovationInfoWithOwner(
      this.inputData.innovationId
    );
    const innovatorInfo = await this.recipientsService.userInfo(innovationInfo.owner.id);
    const unitInfo = await this.recipientsService.organisationUnitInfo(this.inputData.unitId);

    if (innovatorInfo.isActive) {
      this.emails.push({
        templateId: EmailTypeEnum.UNIT_INACTIVATION_SUPPORT_COMPLETED,
        to: { type: 'email', value: innovatorInfo.email },
        params: {
          display_name: innovatorInfo.name,
          innovation_name: innovationInfo.name,
          unit_name: unitInfo.organisationUnit.name,
          support_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('innovator/innovations/:innovationId/support')
            .setPathParams({ innovationId: this.inputData.innovationId })
            .buildUrl(),
        },
      });
    }

    return this;
  }
}
