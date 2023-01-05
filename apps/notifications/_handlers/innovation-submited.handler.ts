import { NotifierTypeEnum, NotificationContextTypeEnum, NotificationContextDetailEnum, UserTypeEnum } from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import type { NotifierTemplatesType } from '@notifications/shared/types';

import { container, EmailTypeEnum, ENV } from '../_config';
import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';

import { BaseHandler } from './base.handler';


export class InnovationSubmitedHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_SUBMITED,
  EmailTypeEnum.INNOVATION_SUBMITED_TO_INNOVATOR | EmailTypeEnum.INNOVATION_SUBMITTED_TO_ASSESSMENT_USERS,
  Record<string, never>
> {

  private recipientsService = container.get<RecipientsServiceType>(RecipientsServiceSymbol);

  constructor(
    requestUser: { id: string, identityId: string, type: UserTypeEnum },
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_SUBMITED]
  ) {
    super(requestUser, data);
  }


  async run(): Promise<this> {

    const innovation = await this.recipientsService.innovationInfoWithOwner(this.inputData.innovationId);
    const assessmentUsers = await this.recipientsService.needsAssessmentUsers();

    this.emails.push({
      templateId: EmailTypeEnum.INNOVATION_SUBMITED_TO_INNOVATOR,
      to: { type: 'identityId', value: innovation.owner.identityId, displayNameParam: 'display_name' },
      params: {
        // display_name: '', // This will be filled by the email-listener function.
        innovation_name: innovation.name
      }
    });

    for (const assessmentUser of assessmentUsers) {
      this.emails.push({
        templateId: EmailTypeEnum.INNOVATION_SUBMITTED_TO_ASSESSMENT_USERS,
        to: { type: 'identityId', value: assessmentUser.identityId, displayNameParam: 'display_name' },
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          innovation_name: innovation.name,
          innovation_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('assessment/innovations/:innovationId')
            .setPathParams({ innovationId: this.inputData.innovationId })
            .buildUrl()
        }
      });
    }

    this.inApp.push({
      innovationId: this.inputData.innovationId,
      domainContext: this.domainContext,
      context: { type: NotificationContextTypeEnum.INNOVATION, detail: NotificationContextDetailEnum.INNOVATION_SUBMISSION, id: this.inputData.innovationId },
      userIds: assessmentUsers.map(user => user.id),
      params: {}
    });

    return this;

  }

}
