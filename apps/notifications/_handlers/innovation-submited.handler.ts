import {
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
  NotifierTypeEnum,
  ServiceRoleEnum
} from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { container, EmailTypeEnum, ENV } from '../_config';

import type { Context } from '@azure/functions';
import type { DomainService } from '@notifications/shared/services';
import SHARED_SYMBOLS from '@notifications/shared/services/symbols';
import type { RecipientType } from '../_services/recipients.service';
import { BaseHandler } from './base.handler';

export class InnovationSubmitedHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_SUBMITED,
  | EmailTypeEnum.INNOVATION_SUBMITED_CONFIRMATION_TO_INNOVATOR
  | EmailTypeEnum.INNOVATION_SUBMITTED_TO_ALL_INNOVATORS
  | EmailTypeEnum.INNOVATION_SUBMITTED_TO_ASSESSMENT_USERS,
  Record<string, never>
> {
  private domainService = container.get<DomainService>(SHARED_SYMBOLS.DomainService);

  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_SUBMITED],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);
    const assessmentUsers = await this.recipientsService.needsAssessmentUsers();

    const requestUserInfo = await this.recipientsService.getUsersRecipient(
      this.requestUser.id,
      ServiceRoleEnum.INNOVATOR
    );
    await this.domainService.users.getUserInfo({ userId: this.requestUser.id });

    const collaborators = (
      await this.recipientsService.getInnovationActiveCollaborators(this.inputData.innovationId)
    ).filter(c => c !== this.requestUser.id);

    const innovatorRecipientIds = [...collaborators];
    if (innovation.ownerId && this.requestUser.id !== innovation.ownerId) {
      innovatorRecipientIds.push(innovation.ownerId);
    }

    const innovatorRecipients = await this.recipientsService.getUsersRecipient(
      innovatorRecipientIds,
      ServiceRoleEnum.INNOVATOR
    );

    if (requestUserInfo) {
      await this.prepareConfirmationEmail(innovation.name, requestUserInfo);
      await this.prepareConfirmationInApp(requestUserInfo);
    }

    await this.prepareEmailToInnovators(innovatorRecipients, innovation.name);
    await this.prepareInAppToInnovators(innovatorRecipients.map(i => i.roleId));

    await this.prepareEmailToAssessmentUsers(assessmentUsers, innovation.name);
    await this.prepareInAppToAssessmentUsers(assessmentUsers.map(na => na.roleId));

    return this;
  }

  async prepareConfirmationEmail(innovationName: string, recipient: RecipientType): Promise<void> {
    this.emails.push({
      templateId: EmailTypeEnum.INNOVATION_SUBMITED_CONFIRMATION_TO_INNOVATOR,
      to: recipient,
      notificationPreferenceType: null,
      params: {
        // display_name: '', // This will be filled by the email-listener function.
        innovation_name: innovationName
      }
    });
  }

  async prepareConfirmationInApp(recipient: RecipientType): Promise<void> {
    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: {
        type: NotificationContextTypeEnum.INNOVATION,
        detail: NotificationContextDetailEnum.INNOVATION_SUBMISSION_TO_INNOVATORS,
        id: this.inputData.innovationId
      },
      userRoleIds: [recipient.roleId],
      params: {}
    });
  }

  async prepareEmailToInnovators(recipients: RecipientType[], innovationName: string): Promise<void> {
    for (const recipient of recipients) {
      this.emails.push({
        templateId: EmailTypeEnum.INNOVATION_SUBMITTED_TO_ALL_INNOVATORS,
        to: recipient,
        notificationPreferenceType: null,
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          innovation_name: innovationName
        }
      });
    }
  }

  async prepareInAppToInnovators(roleIds: string[]): Promise<void> {
    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: {
        type: NotificationContextTypeEnum.INNOVATION,
        detail: NotificationContextDetailEnum.INNOVATION_SUBMISSION_TO_INNOVATORS,
        id: this.inputData.innovationId
      },
      userRoleIds: roleIds,
      params: {}
    });
  }

  async prepareEmailToAssessmentUsers(recipients: RecipientType[], innovationName: string): Promise<void> {
    for (const recipient of recipients) {
      this.emails.push({
        templateId: EmailTypeEnum.INNOVATION_SUBMITTED_TO_ASSESSMENT_USERS,
        to: recipient,
        notificationPreferenceType: null,
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          innovation_name: innovationName,
          innovation_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('assessment/innovations/:innovationId')
            .setPathParams({ innovationId: this.inputData.innovationId })
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
        detail: NotificationContextDetailEnum.INNOVATION_SUBMISSION,
        id: this.inputData.innovationId
      },
      userRoleIds: roleIds,
      params: {}
    });
  }
}
