import {
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
  NotifierTypeEnum,
  ServiceRoleEnum,
} from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { container, EmailTypeEnum, ENV } from '../_config';
import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';

import { BaseHandler } from './base.handler';

export class InnovationReassessmentRequestHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_REASSESSMENT_REQUEST,
  | EmailTypeEnum.INNOVATION_REASSESSMENT_REQUEST_TO_NEEDS_ASSESSMENT
  | EmailTypeEnum.INNOVATION_REASSESSMENT_REQUEST_TO_INNOVATOR,
  Record<string, never>
> {
  private recipientsService = container.get<RecipientsServiceType>(RecipientsServiceSymbol);

  constructor(
    requestUser: { id: string; identityId: string },
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_REASSESSMENT_REQUEST],
    domainContext: DomainContextType
  ) {
    super(requestUser, data, domainContext);
  }

  async run(): Promise<this> {
    if (this.domainContext.currentRole.role !== ServiceRoleEnum.INNOVATOR) {
      return this;
    }

    const innovation = await this.recipientsService.innovationInfoWithOwner(
      this.inputData.innovationId
    );
    const needAssessmentUsers = await this.recipientsService.needsAssessmentUsers();

    if (innovation.owner.isActive) {
      this.emails.push({
        templateId: EmailTypeEnum.INNOVATION_REASSESSMENT_REQUEST_TO_INNOVATOR,
        to: {
          type: 'identityId',
          value: innovation.owner.identityId,
          displayNameParam: 'display_name',
        },
        params: { innovation_name: innovation.name },
      });
    }

    for (const user of needAssessmentUsers) {
      this.emails.push({
        templateId: EmailTypeEnum.INNOVATION_REASSESSMENT_REQUEST_TO_NEEDS_ASSESSMENT,
        to: { type: 'identityId', value: user.identityId, displayNameParam: 'display_name' },
        params: {
          innovation_name: innovation.name,
          innovation_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath(':userBasePath/innovations/:innovationId')
            .setPathParams({
              userBasePath: this.frontendBaseUrl(ServiceRoleEnum.ASSESSMENT),
              innovationId: this.inputData.innovationId,
            })
            .buildUrl(),
        },
      });
    }

    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: {
        type: NotificationContextTypeEnum.INNOVATION,
        detail: NotificationContextDetailEnum.INNOVATION_REASSESSMENT_REQUEST,
        id: this.inputData.innovationId,
      },
      userRoleIds: needAssessmentUsers.map((item) => item.roleId),
      params: {},
    });

    return this;
  }
}
