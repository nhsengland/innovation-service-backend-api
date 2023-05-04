import {
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
  NotifierTypeEnum,
} from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { container, EmailTypeEnum, ENV } from '../_config';
import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';

import { BaseHandler } from './base.handler';
import { DomainServiceSymbol, DomainServiceType } from '@notifications/shared/services';

export class InnovationSubmitedHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_SUBMITED,
  | EmailTypeEnum.INNOVATION_SUBMITED_CONFIRMATION_TO_INNOVATOR | EmailTypeEnum.INNOVATION_SUBMITTED_TO_ALL_INNOVATORS |
  EmailTypeEnum.INNOVATION_SUBMITTED_TO_ASSESSMENT_USERS,
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
    const innovation = await this.recipientsService.innovationInfoWithOwner(
      this.inputData.innovationId
    );
    const assessmentUsers = await this.recipientsService.needsAssessmentUsers();

    const requestUserInfo = await this.domainService.users.getUserInfo({ userId: this.requestUser.id });

    const collaborators = await this.recipientsService.innovationActiveCollaboratorUsers(this.inputData.innovationId);

    // confirmation email
    if (requestUserInfo.isActive) {
      this.emails.push({
        templateId: EmailTypeEnum.INNOVATION_SUBMITED_CONFIRMATION_TO_INNOVATOR,
        to: {
          type: 'identityId',
          value: this.requestUser.identityId,
          displayNameParam: 'display_name',
        },
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          innovation_name: innovation.name,
        },
      });
    }

    // email to all innovators (owner + collaborators) except request user
    for (const collaborator of collaborators.filter(c => c.isActive && c.id !== requestUserInfo.id)) {
      this.emails.push({
        templateId: EmailTypeEnum.INNOVATION_SUBMITTED_TO_ALL_INNOVATORS,
        to: {
          type: 'identityId',
          value: collaborator.identityId,
          displayNameParam: 'display_name',
        },
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          innovation_name: innovation.name,
        }
      })
    }

    for (const assessmentUser of assessmentUsers) {
      this.emails.push({
        templateId: EmailTypeEnum.INNOVATION_SUBMITTED_TO_ASSESSMENT_USERS,
        to: {
          type: 'identityId',
          value: assessmentUser.identityId,
          displayNameParam: 'display_name',
        },
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          innovation_name: innovation.name,
          innovation_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('assessment/innovations/:innovationId')
            .setPathParams({ innovationId: this.inputData.innovationId })
            .buildUrl(),
        },
      });
    }

    // in app notification to assessment users
    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: {
        type: NotificationContextTypeEnum.INNOVATION,
        detail: NotificationContextDetailEnum.INNOVATION_SUBMISSION,
        id: this.inputData.innovationId,
      },
      userRoleIds: assessmentUsers.map((user) => user.roleId),
      params: {},
    });

    // in app notification to innovators users
    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: {
        type: NotificationContextTypeEnum.INNOVATION,
        detail: NotificationContextDetailEnum.INNOVATION_SUBMISSION,
        id: this.inputData.innovationId,
      },
      userRoleIds: collaborators.map(c => c.userRole.id),
      params: {},
    });

    return this;
  }
}
