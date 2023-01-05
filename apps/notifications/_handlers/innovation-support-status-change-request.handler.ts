import type { NotifierTypeEnum, UserTypeEnum } from '@notifications/shared/enums';
import { TranslationHelper } from '@notifications/shared/helpers';
import { UrlModel } from '@notifications/shared/models';
import { DomainServiceSymbol, DomainServiceType } from '@notifications/shared/services';
import type { NotifierTemplatesType } from '@notifications/shared/types';

import { container, EmailTypeEnum, ENV } from '../_config';
import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';

import { BaseHandler } from './base.handler';


export class InnovationSupportStatusChangeRequestHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_SUPPORT_STATUS_CHANGE_REQUEST,
  EmailTypeEnum.ACCESSOR_TO_QA_SUPPORT_CHANGE_REQUEST,
  Record<string, never>
> {

  private domainService = container.get<DomainServiceType>(DomainServiceSymbol);
  private recipientsService = container.get<RecipientsServiceType>(RecipientsServiceSymbol);

  constructor(
    requestUser: { id: string, identityId: string, type: UserTypeEnum },
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_SUPPORT_STATUS_CHANGE_REQUEST]
  ) {
    super(requestUser, data);
  }


  async run(): Promise<this> {

    const requestUserInfo = await this.domainService.users.getUserInfo({ userId: this.requestUser.id });
    const innovation = await this.recipientsService.innovationInfoWithOwner(this.inputData.innovationId);

    // TODO: GET PROPER ORGANISATION UNIT
    const organisationUnit = requestUserInfo.organisations[0]?.organisationUnits[0]?.id || '';
    const qualifyingAccessors = await this.recipientsService.organisationUnitsQualifyingAccessors([organisationUnit]);

    // does not check email preferences. QA will always receive this email.
    for (const qualifyingAccessor of qualifyingAccessors) {

      this.emails.push({
        templateId: EmailTypeEnum.ACCESSOR_TO_QA_SUPPORT_CHANGE_REQUEST,
        to: { type: 'identityId', value: qualifyingAccessor.identityId, displayNameParam: 'display_name' },
        params: {
          innovation_name: innovation.name,
          accessor_name: requestUserInfo.displayName,
          proposed_status: TranslationHelper.translate(`SUPPORT_STATUS.${this.inputData.proposedStatus}`).toLowerCase(),
          request_status_update_comment: this.inputData.requestStatusUpdateComment,
          innovation_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('accessor/innovations/:innovationId/support/:supportId')
            .setPathParams({ innovationId: this.inputData.innovationId, supportId: this.inputData.supportId })
            .buildUrl()
        }
      });

    }

    return this;

  }

}
