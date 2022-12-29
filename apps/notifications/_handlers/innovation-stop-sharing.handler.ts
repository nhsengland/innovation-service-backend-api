import { NotifierTypeEnum, UserTypeEnum, EmailNotificationTypeEnum } from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import type { NotifierTemplatesType } from '@notifications/shared/types';

import { container, EmailTypeEnum, ENV } from '../_config';
import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';

import { BaseHandler } from './base.handler';


export class InnovationStopSharingHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_STOP_SHARING,
  EmailTypeEnum.INNOVATION_STOP_SHARING_TO_ENGAGING_ACCESSORS | EmailTypeEnum.INNOVATION_STOP_SHARING_TO_INNOVATOR,
  { innovationId: string }
> {

  private recipientsService = container.get<RecipientsServiceType>(RecipientsServiceSymbol);

  constructor(
    requestUser: { id: string, identityId: string, type: UserTypeEnum },
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_STOP_SHARING]
  ) {
    super(requestUser, data);
  }


  async run(): Promise<this> {

    if (this.requestUser.type !== UserTypeEnum.INNOVATOR) {
      return this;
    }

    const innovation = await this.recipientsService.innovationInfoWithOwner(this.inputData.innovationId);
    const assignedUsers = await this.recipientsService.innovationAssignedUsers({ innovationId: this.inputData.innovationId });
    const owner = await this.recipientsService.userInfo(innovation.owner.id);

    this.emails.push({
      templateId: EmailTypeEnum.INNOVATION_STOP_SHARING_TO_INNOVATOR,
      to: { type: 'identityId', value: innovation.owner.identityId, displayNameParam: 'display_name' },
      params: {
        innovation_name: innovation.name,
        innovation_url: new UrlModel(ENV.webBaseTransactionalUrl)
          .addPath(':userBasePath/innovations/:innovationId')
          .setPathParams({ userBasePath: this.frontendBaseUrl(innovation.owner.type), innovationId: this.inputData.innovationId })
          .buildUrl()
      }
    });

    for (const user of assignedUsers.filter(item => this.isEmailPreferenceInstantly(EmailNotificationTypeEnum.SUPPORT, item.emailNotificationPreferences))) {
      this.emails.push({
        templateId: EmailTypeEnum.INNOVATION_STOP_SHARING_TO_ENGAGING_ACCESSORS,
        to: { type: 'identityId', value: user.identityId, displayNameParam: 'display_name' },
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          innovation_name: innovation.name,
          innovator_name: owner.name,
          stop_sharing_comment: this.inputData.stopSharingComment
        }
      });
    }

    return this;
  }

}
