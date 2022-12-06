import type { EmailNotificationPreferenceEnum, EmailNotificationTypeEnum, InnovationSupportStatusEnum, NotifierTypeEnum, UserTypeEnum } from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import { DomainServiceSymbol, DomainServiceType } from '@notifications/shared/services';
import type { NotifierTemplatesType } from '@notifications/shared/types';

import { container, EmailTypeEnum, ENV } from '../_config';
import { translate } from '../_helpers/translate.helper';
import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';

import { BaseHandler } from './base.handler';


export class InnovationSupportStatusChangeRequestHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_SUPPORT_STATUS_CHANGE_REQUEST,
  EmailTypeEnum.ACCESSOR_TO_QA_SUPPORT_CHANGE_REQUEST,
  { innovationId: string, accessorId: string, supportStatus: InnovationSupportStatusEnum }
> {

  private domainService = container.get<DomainServiceType>(DomainServiceSymbol);
  private recipientsService = container.get<RecipientsServiceType>(RecipientsServiceSymbol);

  private data: {
    innovation?: { name: string, owner: { id: string, identityId: string, type: UserTypeEnum, emailNotificationPreferences: { type: EmailNotificationTypeEnum, preference: EmailNotificationPreferenceEnum }[] } },
    requestUser?: { displayName: string, identityId: string },
  } = {};


  constructor(
    requestUser: { id: string, identityId: string, type: UserTypeEnum },
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_SUPPORT_STATUS_CHANGE_REQUEST]
  ) {
    super(requestUser, data);
  }


  async run(): Promise<this> {

    const requestUserInfo = await this.domainService.users.getUserInfo({ userId: this.requestUser.id });

    this.data.requestUser = {
      displayName: requestUserInfo.displayName,
      identityId: requestUserInfo.identityId,
    }

    const organisationUnit = requestUserInfo.organisations[0]?.organisationUnits[0]?.id || '';

    this.data.innovation = await this.recipientsService.innovationInfoWithOwner(this.inputData.innovationId);
    const qualifyingAccessors = await this.recipientsService.organisationUnitsQualifyingAccessors([ organisationUnit ]);

    await this.prepareEmailForQA(qualifyingAccessors.map(qa => qa.identityId));

    return this;

  }


  // Private methods.

  private async prepareEmailForQA(qualifyingAccessors: string[]): Promise<void> {

    // does not check email preferences. QA will always receive this email.
    for (const qualifyingAccessor of qualifyingAccessors) {
      this.emails.push({
        templateId: EmailTypeEnum.ACCESSOR_TO_QA_SUPPORT_CHANGE_REQUEST,
        to: { type: 'identityId', value: qualifyingAccessor || '', displayNameParam: 'display_name' },
        params: {
          innovation_name: this.data.innovation?.name || '',
          accessor_name: this.data.requestUser?.displayName || '',
          proposed_status: translate(this.inputData.proposedStatus),
          request_status_update_comment: this.inputData.requestStatusUpdateComment || '',
          innovation_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('accessor/innovations/:innovationId/supports/:supportId')
            .setPathParams({ innovationId: this.inputData.innovationId, supportId: this.inputData.supportId })
            .buildUrl()
        }
      });
    }

  }

}
