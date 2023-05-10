import {
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
  NotifierTypeEnum
} from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { container, EmailTypeEnum, ENV } from '../_config';
import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';

import { BaseHandler } from './base.handler';
import { DomainServiceSymbol, DomainServiceType } from '@notifications/shared/services';

export class InnovationSubmitedHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_SUBMITED,
  | EmailTypeEnum.INNOVATION_SUBMITED_CONFIRMATION_TO_INNOVATOR
  | EmailTypeEnum.INNOVATION_SUBMITTED_TO_ALL_INNOVATORS
  | EmailTypeEnum.INNOVATION_SUBMITTED_TO_ASSESSMENT_USERS,
  Record<string, never>
> {
  private recipientsService = container.get<RecipientsServiceType>(RecipientsServiceSymbol);
  private domainService = container.get<DomainServiceType>(DomainServiceSymbol);

  constructor(
    requestUser: { id: string; identityId: string },
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_SUBMITED],
    domainContext: DomainContextType
  ) {
    super(requestUser, data, domainContext);
  }

  async run(): Promise<this> {
    const innovation = await this.recipientsService.innovationInfoWithOwner(this.inputData.innovationId);
    const assessmentUsers = await this.recipientsService.needsAssessmentUsers();

    const requestUserInfo = await this.domainService.users.getUserInfo({ userId: this.requestUser.id });

    const collaborators = (
      await this.recipientsService.innovationActiveCollaboratorUsers(this.inputData.innovationId)
    ).filter(c => c.isActive && c.id !== this.requestUser.id);

    const innovatorRecipients = [...collaborators];
    if (this.requestUser.id !== innovation.owner.id) {
      innovatorRecipients.push(innovation.owner);
    }

    if (requestUserInfo.isActive) {
      await this.prepareConfirmationEmail(innovation.name);
      await this.prepareConfirmationInApp();
    }

    await this.prepareEmailToInnovators(
      innovatorRecipients.map(i => i.identityId),
      innovation.name
    );
    await this.prepareInAppToInnovators(innovatorRecipients.map(i => i.userRole.id));

    await this.prepareEmailToAssessmentUsers(
      assessmentUsers.map(na => na.identityId),
      innovation.name
    );
    await this.prepareInAppToAssessmentUsers(assessmentUsers.map(na => na.roleId));

    return this;
  }

  async prepareConfirmationEmail(innovationName: string): Promise<void> {
    this.emails.push({
      templateId: EmailTypeEnum.INNOVATION_SUBMITED_CONFIRMATION_TO_INNOVATOR,
      to: {
        type: 'identityId',
        value: this.requestUser.identityId,
        displayNameParam: 'display_name'
      },
      params: {
        // display_name: '', // This will be filled by the email-listener function.
        innovation_name: innovationName
      }
    });
  }

  async prepareConfirmationInApp(): Promise<void> {
    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: {
        type: NotificationContextTypeEnum.INNOVATION,
        detail: NotificationContextDetailEnum.INNOVATION_SUBMISSION_TO_INNOVATORS,
        id: this.inputData.innovationId
      },
      userRoleIds: [this.domainContext.currentRole.id],
      params: {}
    });
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

  async prepareEmailToAssessmentUsers(identityIds: string[], innovationName: string): Promise<void> {
    for (const identityId of identityIds) {
      this.emails.push({
        templateId: EmailTypeEnum.INNOVATION_SUBMITTED_TO_ASSESSMENT_USERS,
        to: {
          type: 'identityId',
          value: identityId,
          displayNameParam: 'display_name'
        },
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
