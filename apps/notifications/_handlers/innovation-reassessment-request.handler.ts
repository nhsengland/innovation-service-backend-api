import {
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
  NotifierTypeEnum,
  ServiceRoleEnum
} from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { container, EmailTypeEnum, ENV } from '../_config';
import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';

import { BaseHandler } from './base.handler';

export class InnovationReassessmentRequestHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_REASSESSMENT_REQUEST,
  | EmailTypeEnum.INNOVATION_REASSESSMENT_REQUEST_TO_NEEDS_ASSESSMENT
  | EmailTypeEnum.INNOVATION_SUBMITTED_TO_ALL_INNOVATORS
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

    const innovation = await this.recipientsService.innovationInfoWithOwner(this.inputData.innovationId);
    const collaborators = (
      await this.recipientsService.innovationActiveCollaboratorUsers(this.inputData.innovationId)
    ).filter(c => c.userRole.id !== this.domainContext.currentRole.id && c.isActive);

    const innovatorRecipients = [...collaborators];
    if (innovation.owner.isActive && this.domainContext.currentRole.id !== innovation.owner.userRole.id) {
      innovatorRecipients.push(innovation.owner);
    }

    const needAssessmentUsers = await this.recipientsService.needsAssessmentUsers();

    await this.prepareEmailToInnovators(
      innovatorRecipients.map(i => i.identityId),
      innovation.name
    );
    await this.prepareInAppToInnovators(innovatorRecipients.map(i => i.userRole.id));
    await this.prepareConfirmationEmail(innovation.name);
    await this.prepareConfirmationInApp();

    await this.prepareEmailToAssessmentUsers(
      needAssessmentUsers.map(na => na.identityId),
      innovation.name
    );
    await this.prepareInAppToAssessmentUsers(needAssessmentUsers.map(na => na.roleId));

    return this;
  }

  async prepareEmailToInnovators(identityIds: string[], innovationName: string): Promise<void> {
    for (const identityId of identityIds) {
      this.emails.push({
        templateId: EmailTypeEnum.INNOVATION_SUBMITTED_TO_ALL_INNOVATORS,
        to: {
          type: 'identityId',
          value: identityId,
          displayNameParam: 'display_name'
        },
        params: { innovation_name: innovationName }
      });
    }
  }

  async prepareInAppToInnovators(roleIds: string[]): Promise<void> {
    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: {
        type: NotificationContextTypeEnum.NEEDS_ASSESSMENT,
        detail: NotificationContextDetailEnum.INNOVATION_SUBMISSION_REASSESSMENT,
        id: this.inputData.innovationId
      },
      userRoleIds: roleIds,
      params: {}
    });
  }

  async prepareConfirmationEmail(innovationName: string): Promise<void> {
    this.emails.push({
      templateId: EmailTypeEnum.INNOVATION_REASSESSMENT_REQUEST_TO_INNOVATOR,
      to: {
        type: 'identityId',
        value: this.domainContext.identityId,
        displayNameParam: 'display_name'
      },
      params: { innovation_name: innovationName }
    });
  }

  async prepareConfirmationInApp(): Promise<void> {
    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: {
        type: NotificationContextTypeEnum.NEEDS_ASSESSMENT,
        detail: NotificationContextDetailEnum.INNOVATION_SUBMISSION_REASSESSMENT,
        id: this.inputData.innovationId
      },
      userRoleIds: [this.domainContext.currentRole.id],
      params: {}
    });
  }
  async prepareEmailToAssessmentUsers(identityIds: string[], innovationName: string): Promise<void> {
    for (const identityId of identityIds) {
      this.emails.push({
        templateId: EmailTypeEnum.INNOVATION_REASSESSMENT_REQUEST_TO_NEEDS_ASSESSMENT,
        to: { type: 'identityId', value: identityId, displayNameParam: 'display_name' },
        params: {
          innovation_name: innovationName,
          innovation_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath(':userBasePath/innovations/:innovationId')
            .setPathParams({
              userBasePath: this.frontendBaseUrl(ServiceRoleEnum.ASSESSMENT),
              innovationId: this.inputData.innovationId
            })
            .buildUrl()
        }
      });
    }
  }

  async prepareInAppToAssessmentUsers(roleIds: string[]): Promise<void> {
    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: {
        type: NotificationContextTypeEnum.NEEDS_ASSESSMENT,
        detail: NotificationContextDetailEnum.INNOVATION_REASSESSMENT_REQUEST,
        id: this.inputData.innovationId
      },
      userRoleIds: roleIds,
      params: {}
    });
  }
}
