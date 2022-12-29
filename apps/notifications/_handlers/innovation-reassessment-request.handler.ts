import { NotifierTypeEnum, UserTypeEnum, NotificationContextTypeEnum, NotificationContextDetailEnum } from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import type { NotifierTemplatesType } from '@notifications/shared/types';

import { container, EmailTypeEnum, ENV } from '../_config';
import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';

import { BaseHandler } from './base.handler';


export class InnovationReassessmentRequestHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_REASSESSMENT_REQUEST,
  EmailTypeEnum.INNOVATION_REASSESSMENT_REQUEST_TO_NEEDS_ASSESSMENT | EmailTypeEnum.INNOVATION_REASSESSMENT_REQUEST_TO_INNOVATOR,
  { innovationId: string }
> {

  private recipientsService = container.get<RecipientsServiceType>(RecipientsServiceSymbol);

  constructor(
    requestUser: { id: string, identityId: string, type: UserTypeEnum },
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_REASSESSMENT_REQUEST]
  ) {
    super(requestUser, data);
  }


  async run(): Promise<this> {

    if (this.requestUser.type !== UserTypeEnum.INNOVATOR) {
      return this;
    }


    const innovation = await this.recipientsService.innovationInfoWithOwner(this.inputData.innovationId);
    const needAssessmentUsers = await this.recipientsService.needsAssessmentUsers();

    this.emails.push({
      templateId: EmailTypeEnum.INNOVATION_REASSESSMENT_REQUEST_TO_INNOVATOR,
      to: { type: 'identityId', value: innovation.owner.identityId, displayNameParam: 'display_name' },
      params: {
        innovation_name: innovation.name
      }
    });

    for (const user of needAssessmentUsers) {
      this.emails.push({
        templateId: EmailTypeEnum.INNOVATION_REASSESSMENT_REQUEST_TO_NEEDS_ASSESSMENT,
        to: { type: 'identityId', value: user.identityId, displayNameParam: 'display_name' },
        params: {
          innovation_name: innovation.name,
          innovation_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath(':userBasePath/innovations/:innovationId')
            .setPathParams({ userBasePath: this.frontendBaseUrl(UserTypeEnum.ASSESSMENT), innovationId: this.inputData.innovationId })
            .buildUrl()
        }
      });

    }

    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: { type: NotificationContextTypeEnum.INNOVATION, detail: NotificationContextDetailEnum.INNOVATION_REASSESSMENT_REQUEST, id: this.inputData.innovationId },
      userIds: needAssessmentUsers.map(item => item.id),
      params: { innovationId: this.inputData.innovationId }
    });

    return this;

  }

}
