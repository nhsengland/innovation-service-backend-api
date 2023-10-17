import type { NotifierTypeEnum } from '@notifications/shared/enums';
import { TranslationHelper } from '@notifications/shared/helpers';
import { UrlModel } from '@notifications/shared/models';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { EmailTypeEnum, ENV } from '../../_config';

import type { Context } from '@azure/functions';
import { BaseHandler } from '../base.handler';

export class InnovationSupportStatusChangeRequestHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_SUPPORT_STATUS_CHANGE_REQUEST,
  EmailTypeEnum.ACCESSOR_TO_QA_SUPPORT_CHANGE_REQUEST,
  never
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_SUPPORT_STATUS_CHANGE_REQUEST],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const requestUserInfo = await this.recipientsService.usersIdentityInfo(this.requestUser.identityId);
    const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);

    const organisationUnit = this.requestUser?.organisation?.organisationUnit?.id || '';
    const qualifyingAccessors = await this.recipientsService.organisationUnitsQualifyingAccessors([organisationUnit]);

    // does not check email preferences. QA will always receive this email.
    for (const qualifyingAccessor of qualifyingAccessors) {
      this.emails.push({
        templateId: EmailTypeEnum.ACCESSOR_TO_QA_SUPPORT_CHANGE_REQUEST,
        to: qualifyingAccessor,
        notificationPreferenceType: null,
        params: {
          innovation_name: innovation.name,
          accessor_name: requestUserInfo?.displayName || 'user',
          proposed_status: TranslationHelper.translate(`SUPPORT_STATUS.${this.inputData.proposedStatus}`).toLowerCase(),
          request_status_update_comment: this.inputData.requestStatusUpdateComment,
          innovation_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('accessor/innovations/:innovationId/support/:supportId')
            .setPathParams({
              innovationId: this.inputData.innovationId,
              supportId: this.inputData.supportId
            })
            .buildUrl()
        }
      });
    }

    return this;
  }
}
