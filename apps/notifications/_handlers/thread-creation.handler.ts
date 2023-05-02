import {
  EmailNotificationPreferenceEnum,
  EmailNotificationTypeEnum,
  InnovationCollaboratorStatusEnum,
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
  NotifierTypeEnum,
  ServiceRoleEnum,
} from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import { DomainServiceSymbol, DomainServiceType } from '@notifications/shared/services';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { container, EmailTypeEnum, ENV } from '../_config';
import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';

import { BaseHandler } from './base.handler';
import type { UserRoleEntity } from '@notifications/shared/entities';

type InnovatorRecipientType = {
  id: string;
  identityId: string;
  userRole: UserRoleEntity;
  isActive: boolean;
  emailNotificationPreferences: {
    type: EmailNotificationTypeEnum;
    preference: EmailNotificationPreferenceEnum;
  }[];
}

export class ThreadCreationHandler extends BaseHandler<
  NotifierTypeEnum.THREAD_CREATION,
  EmailTypeEnum.THREAD_CREATION_TO_INNOVATOR_FROM_ASSIGNED_USER | EmailTypeEnum.THREAD_CREATION_TO_INNOVATOR_FROM_INNOVATOR | EmailTypeEnum.THREAD_CREATION_TO_ASSIGNED_USERS,
  { subject: string; messageId: string }
> {
  private domainService = container.get<DomainServiceType>(DomainServiceSymbol);
  private recipientsService = container.get<RecipientsServiceType>(RecipientsServiceSymbol);

  private data: {
    innovation?: { name: string, owner: { id: string, identityId: string, userRole: UserRoleEntity, isActive: boolean, emailNotificationPreferences: { type: EmailNotificationTypeEnum, preference: EmailNotificationPreferenceEnum }[] }}
  } = {};

  constructor(
    requestUser: { id: string; identityId: string },
    data: NotifierTemplatesType[NotifierTypeEnum.THREAD_CREATION],
    domainContext: DomainContextType
  ) {
    super(requestUser, data, domainContext);
  }

  async run(): Promise<this> {

    this.data.innovation = await this.recipientsService.innovationInfoWithOwner(this.inputData.innovationId);
    
    switch (this.domainContext.currentRole.role) {
      case ServiceRoleEnum.ASSESSMENT:
      case ServiceRoleEnum.ACCESSOR:
      case ServiceRoleEnum.QUALIFYING_ACCESSOR:
        await this.prepareNotificationForInnovationOwnerFromAssignedUser();
        await this.prepareNotificationForCollaboratorsFromAssignedUser();
        break;

      case ServiceRoleEnum.INNOVATOR:
        await this.prepareNotificationForAssignedUsers();
        await this.prepareNotificationForOwnerAndCollaboratorsFromInnovator();
        break;

      default:
        break;
    }

    return this;
  }

  // Private methods.

  private async prepareNotificationForInnovationOwnerFromAssignedUser(): Promise<void> {
    const requestUserInfo = await this.domainService.users.getUserInfo({
      userId: this.requestUser.id,
    });
    const requestUserUnitName =
      this.domainContext.currentRole.role === ServiceRoleEnum.ASSESSMENT
        ? 'needs assessment'
        : this.domainContext?.organisation?.organisationUnit?.name ?? '';

    const innovation = await this.recipientsService.innovationInfoWithOwner(
      this.inputData.innovationId
    );
    const thread = await this.recipientsService.threadInfo(this.inputData.threadId);

    // Send email only to user if email preference INSTANTLY.
    if (
      this.isEmailPreferenceInstantly(
        EmailNotificationTypeEnum.MESSAGE,
        innovation.owner.emailNotificationPreferences
      ) &&
      innovation.owner.isActive
    ) {
      this.emails.push({
        templateId: EmailTypeEnum.THREAD_CREATION_TO_INNOVATOR_FROM_ASSIGNED_USER,
        to: {
          type: 'identityId',
          value: innovation.owner.identityId,
          displayNameParam: 'display_name',
        },
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          accessor_name: requestUserInfo.displayName,
          unit_name: requestUserUnitName,
          thread_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath(':userBasePath/innovations/:innovationId/threads/:threadId')
            .setPathParams({
              userBasePath: this.frontendBaseUrl(ServiceRoleEnum.INNOVATOR),
              innovationId: this.inputData.innovationId,
              threadId: this.inputData.threadId,
            })
            .buildUrl(),
        },
      });
    }

    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: {
        type: NotificationContextTypeEnum.THREAD,
        detail: NotificationContextDetailEnum.THREAD_CREATION,
        id: this.inputData.threadId,
      },
      userRoleIds: [innovation.owner.userRole.id],
      params: { subject: thread.subject, messageId: this.inputData.messageId },
    });
  }

  private async prepareNotificationForCollaboratorsFromAssignedUser(): Promise<void> {
    const requestUserInfo = await this.domainService.users.getUserInfo({
      userId: this.requestUser.id,
    });
    const requestUserUnitName =
      this.domainContext.currentRole.role === ServiceRoleEnum.ASSESSMENT
        ? 'needs assessment'
        : this.domainContext?.organisation?.organisationUnit?.name ?? '';

    const collaborators = (await this.recipientsService.innovationInfoWithCollaborators(this.inputData.innovationId)).collaborators
      .filter(c => c.status === InnovationCollaboratorStatusEnum.ACTIVE)
      .map(c => c.user)
      .filter((item): item is InnovatorRecipientType => item !== undefined); //filter undefined items

    const thread = await this.recipientsService.threadInfo(this.inputData.threadId);

    for (const collaborator of collaborators.filter(c => c.isActive)) {
      // Send email only to user if email preference INSTANTLY.
      if (this.isEmailPreferenceInstantly( EmailNotificationTypeEnum.MESSAGE, collaborator.emailNotificationPreferences)) {
        this.emails.push({
          templateId: EmailTypeEnum.THREAD_CREATION_TO_INNOVATOR_FROM_ASSIGNED_USER,
          to: {
            type: 'identityId',
            value: collaborator.identityId,
            displayNameParam: 'display_name',
          },
          params: {
            // display_name: '', // This will be filled by the email-listener function.
            accessor_name: requestUserInfo.displayName,
            unit_name: requestUserUnitName,
            thread_url: new UrlModel(ENV.webBaseTransactionalUrl)
              .addPath(':userBasePath/innovations/:innovationId/threads/:threadId')
              .setPathParams({
                userBasePath: this.frontendBaseUrl(ServiceRoleEnum.INNOVATOR),
                innovationId: this.inputData.innovationId,
                threadId: this.inputData.threadId,
              })
              .buildUrl(),
          },
        });
      }
    }

    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: {
        type: NotificationContextTypeEnum.THREAD,
        detail: NotificationContextDetailEnum.THREAD_CREATION,
        id: this.inputData.threadId,
      },
      userRoleIds: collaborators.map(c => c.userRole.id),
      params: { subject: thread.subject, messageId: this.inputData.messageId },
    });
  }

  private async prepareNotificationForOwnerAndCollaboratorsFromInnovator(): Promise<void> {

    const thread = await this.recipientsService.threadInfo(this.inputData.threadId);
    const collaborators = (await this.recipientsService.innovationInfoWithCollaborators(this.inputData.innovationId)).collaborators
      .filter(c => c.status === InnovationCollaboratorStatusEnum.ACTIVE)
      .map(c => c.user)
      .filter((item): item is InnovatorRecipientType => item !== undefined && item.userRole !== undefined && item.userRole.id !== this.domainContext.currentRole.id) //filter undefined items and request user
    
    if (this.data.innovation?.owner && this.domainContext.currentRole.id !== this.data.innovation?.owner.userRole.id) {
      collaborators.push(this.data.innovation?.owner)
    }

    for (const collaborator of collaborators.filter(c => c.isActive)) {
      // Send email only to user if email preference INSTANTLY.
      if ( this.isEmailPreferenceInstantly( EmailNotificationTypeEnum.MESSAGE, collaborator.emailNotificationPreferences)) {
        this.emails.push({
          templateId: EmailTypeEnum.THREAD_CREATION_TO_INNOVATOR_FROM_INNOVATOR,
          to: {
            type: 'identityId',
            value: collaborator.identityId,
            displayNameParam: 'display_name',
          },
          params: {
            // display_name: '', // This will be filled by the email-listener function.
            subject: thread.subject,
            innovation_name: this.data.innovation?.name || '',
            thread_url: new UrlModel(ENV.webBaseTransactionalUrl)
              .addPath(':userBasePath/innovations/:innovationId/threads/:threadId')
              .setPathParams({
                userBasePath: this.frontendBaseUrl(ServiceRoleEnum.INNOVATOR),
                innovationId: this.inputData.innovationId,
                threadId: this.inputData.threadId,
              })
              .buildUrl(),
          },
        });
      }
    }
    
    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: {
        type: NotificationContextTypeEnum.THREAD,
        detail: NotificationContextDetailEnum.THREAD_CREATION,
        id: this.inputData.threadId,
      },
      userRoleIds: collaborators.map(c => c.userRole.id),
      params: { subject: thread.subject, messageId: this.inputData.messageId },
    });
  }

  private async prepareNotificationForAssignedUsers(): Promise<void> {
    const innovation = await this.recipientsService.innovationInfoWithOwner(
      this.inputData.innovationId
    );
    const thread = await this.recipientsService.threadInfo(this.inputData.threadId);
    const assignedUsers = await this.recipientsService.innovationAssignedUsers({
      innovationId: this.inputData.innovationId,
    });

    // Send emails only to users with email preference INSTANTLY.
    for (const user of assignedUsers.filter((item) =>
      this.isEmailPreferenceInstantly(
        EmailNotificationTypeEnum.MESSAGE,
        item.emailNotificationPreferences
      )
    )) {
      this.emails.push({
        templateId: EmailTypeEnum.THREAD_CREATION_TO_ASSIGNED_USERS,
        to: { type: 'identityId', value: user.identityId, displayNameParam: 'display_name' },
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          innovation_name: innovation.name,
          thread_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath(':userBasePath/innovations/:innovationId/threads/:threadId')
            .setPathParams({
              userBasePath: this.frontendBaseUrl(user.userRole.role),
              innovationId: this.inputData.innovationId,
              threadId: this.inputData.threadId,
            })
            .buildUrl(),
        },
      });
    }

    if (assignedUsers.length > 0) {
      this.inApp.push({
        innovationId: this.inputData.innovationId,
        context: {
          type: NotificationContextTypeEnum.THREAD,
          detail: NotificationContextDetailEnum.THREAD_CREATION,
          id: this.inputData.threadId,
        },
        userRoleIds: assignedUsers.map((item) => item.userRole.id),
        params: { subject: thread.subject, messageId: this.inputData.messageId },
      });
    }
  }
}
