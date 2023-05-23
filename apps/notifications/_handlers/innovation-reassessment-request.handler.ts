import {
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
  NotifierTypeEnum,
  ServiceRoleEnum
} from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { EmailTypeEnum, ENV } from '../_config';

import type { RecipientType } from '../_services/recipients.service';
import { BaseHandler } from './base.handler';
import type { Context } from '@azure/functions';

export class InnovationReassessmentRequestHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_REASSESSMENT_REQUEST,
  | EmailTypeEnum.INNOVATION_REASSESSMENT_REQUEST_TO_NEEDS_ASSESSMENT
  | EmailTypeEnum.INNOVATION_SUBMITTED_TO_ALL_INNOVATORS
  | EmailTypeEnum.INNOVATION_REASSESSMENT_REQUEST_TO_INNOVATOR,
  Record<string, never>
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_REASSESSMENT_REQUEST],
    azureContext: Context
) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    if (this.requestUser.currentRole.role !== ServiceRoleEnum.INNOVATOR) {
      return this;
    }

    const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);
    const innovatorRecipientIds = (
      await this.recipientsService.getInnovationActiveCollaborators(this.inputData.innovationId)
    ).filter(c => c !== this.requestUser.id);

    if (this.requestUser.id !== innovation.ownerId) {
      innovatorRecipientIds.push(innovation.ownerId);
    }

    const innovatorRecipients = await this.recipientsService.getUsersRecipient(
      innovatorRecipientIds,
      ServiceRoleEnum.INNOVATOR
    );

    const needAssessmentUsers = await this.recipientsService.needsAssessmentUsers();
    const requestingInnovator = await this.recipientsService.getUsersRecipient(
      this.requestUser.id,
      this.requestUser.currentRole.role
    );

    await this.prepareEmailToInnovators(innovatorRecipients, innovation.name);
    await this.prepareInAppToInnovators(innovatorRecipients.map(i => i.roleId));
    if (requestingInnovator) {
      await this.prepareConfirmationEmail(innovation.name, requestingInnovator);
      await this.prepareConfirmationInApp(requestingInnovator);
    }

    await this.prepareEmailToAssessmentUsers(needAssessmentUsers, innovation.name);
    await this.prepareInAppToAssessmentUsers(needAssessmentUsers.map(na => na.roleId));

    return this;
  }

  async prepareEmailToInnovators(recipients: RecipientType[], innovationName: string): Promise<void> {
    for (const recipient of recipients) {
      this.emails.push({
        templateId: EmailTypeEnum.INNOVATION_SUBMITTED_TO_ALL_INNOVATORS,
        to: recipient,
        notificationPreferenceType: null,
        params: { innovation_name: innovationName }
      });
    }
  }

  async prepareInAppToInnovators(roleIds: string[]): Promise<void> {
    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: {
        type: NotificationContextTypeEnum.INNOVATION,
        detail: NotificationContextDetailEnum.INNOVATION_SUBMISSION_REASSESSMENT,
        id: this.inputData.innovationId
      },
      userRoleIds: roleIds,
      params: {}
    });
  }

  async prepareConfirmationEmail(innovationName: string, innovator: RecipientType): Promise<void> {
    this.emails.push({
      templateId: EmailTypeEnum.INNOVATION_REASSESSMENT_REQUEST_TO_INNOVATOR,
      to: innovator,
      notificationPreferenceType: null,
      params: { innovation_name: innovationName }
    });
  }

  async prepareConfirmationInApp(innovator: RecipientType): Promise<void> {
    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: {
        type: NotificationContextTypeEnum.INNOVATION,
        detail: NotificationContextDetailEnum.INNOVATION_SUBMISSION_REASSESSMENT,
        id: this.inputData.innovationId
      },
      userRoleIds: [innovator.roleId],
      params: {}
    });
  }
  async prepareEmailToAssessmentUsers(recipients: RecipientType[], innovationName: string): Promise<void> {
    for (const recipient of recipients) {
      this.emails.push({
        templateId: EmailTypeEnum.INNOVATION_REASSESSMENT_REQUEST_TO_NEEDS_ASSESSMENT,
        to: recipient,
        notificationPreferenceType: null,
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
        type: NotificationContextTypeEnum.INNOVATION,
        detail: NotificationContextDetailEnum.INNOVATION_REASSESSMENT_REQUEST,
        id: this.inputData.innovationId
      },
      userRoleIds: roleIds,
      params: {}
    });
  }
}
