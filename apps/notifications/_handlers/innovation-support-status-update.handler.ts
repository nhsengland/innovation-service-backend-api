import {
  EmailNotificationPreferenceEnum,
  EmailNotificationTypeEnum,
  InnovationSupportStatusEnum,
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
  NotifierTypeEnum
} from '@notifications/shared/enums';
import { TranslationHelper } from '@notifications/shared/helpers';
import { UrlModel } from '@notifications/shared/models';
import { DomainServiceSymbol, DomainServiceType } from '@notifications/shared/services';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { container, EmailTypeEnum, ENV } from '../_config';
import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';

import { BaseHandler } from './base.handler';
import type { UserRoleEntity } from '@notifications/shared/entities';

export class InnovationSupportStatusUpdateHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_SUPPORT_STATUS_UPDATE,
  | EmailTypeEnum.INNOVATION_SUPPORT_STATUS_UPDATE_TO_INNOVATOR
  | EmailTypeEnum.INNOVATION_SUPPORT_STATUS_UPDATE_TO_ASSIGNED_ACCESSORS,
  { organisationUnitName: string; supportStatus: InnovationSupportStatusEnum }
> {
  private domainService = container.get<DomainServiceType>(DomainServiceSymbol);
  private recipientsService = container.get<RecipientsServiceType>(RecipientsServiceSymbol);

  private data: {
    innovation?: {
      name: string;
      owner: {
        id: string;
        identityId: string;
        userRole: UserRoleEntity;
        isActive: boolean;
        emailNotificationPreferences: {
          type: EmailNotificationTypeEnum;
          preference: EmailNotificationPreferenceEnum;
        }[];
      };
    };
    innovationCollaborators?: {
      id: string;
      identityId: string;
      userRole: UserRoleEntity;
      isActive: boolean;
      emailNotificationPreferences: {
        type: EmailNotificationTypeEnum;
        preference: EmailNotificationPreferenceEnum;
      }[];
    }[];
    requestUserAdditionalInfo?: {
      displayName?: string;
      organisation: { id: string; name: string };
      organisationUnit: { id: string; name: string };
    };
  } = {};

  constructor(
    requestUser: { id: string; identityId: string },
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_SUPPORT_STATUS_UPDATE],
    domainContext: DomainContextType
  ) {
    super(requestUser, data, domainContext);
  }

  async run(): Promise<this> {
    const requestUserInfo = await this.domainService.users.getUserInfo({
      userId: this.requestUser.id
    });

    this.data.innovation = await this.recipientsService.innovationInfoWithOwner(this.inputData.innovationId);

    this.data.innovationCollaborators = await this.recipientsService.innovationActiveCollaboratorUsers(
      this.inputData.innovationId
    );

    this.data.requestUserAdditionalInfo = {
      displayName: requestUserInfo.displayName,
      organisation: {
        id: this.domainContext.organisation?.id ?? '',
        name: this.domainContext.organisation?.name ?? ''
      },
      organisationUnit: {
        id: this.domainContext?.organisation?.organisationUnit?.id ?? '',
        name: this.domainContext?.organisation?.organisationUnit?.name ?? ''
      }
    };

    // If the innovation is not found, then we don't need to send any notification. (This could probably throw an error as it should not happen, but leaving like this.)
    if (!this.data.innovation) {
      return this;
    }

    if (this.inputData.innovationSupport.statusChanged) {
      await this.prepareEmailForInnovators();
      await this.prepareInAppForInnovator();

      if (
        [
          InnovationSupportStatusEnum.NOT_YET,
          InnovationSupportStatusEnum.WAITING,
          InnovationSupportStatusEnum.WITHDRAWN,
          InnovationSupportStatusEnum.FURTHER_INFO_REQUIRED
        ].includes(this.inputData.innovationSupport.status)
      ) {
        await this.prepareInAppForAssessmentWhenWaitingStatus();
      }
    }

    if (this.inputData.innovationSupport.status === InnovationSupportStatusEnum.ENGAGING) {
      await this.prepareInAppForAccessorsWhenEngaging();
      await this.prepareEmailForNewAccessors(
        this.inputData.innovationSupport.newAssignedAccessors?.filter(a => a.id !== this.requestUser.id)
      );
    }

    return this;
  }

  // Private methods.

  private async prepareEmailForInnovators(): Promise<void> {
    const innovators = this.data.innovationCollaborators ? [...this.data.innovationCollaborators] : [];
    if (this.data.innovation?.owner) {
      innovators.push(this.data.innovation.owner);
    }

    // Send email only to user if email preference INSTANTLY.
    for (const innovator of innovators)
      if (
        this.isEmailPreferenceInstantly(
          EmailNotificationTypeEnum.SUPPORT,
          innovator.emailNotificationPreferences || []
        ) &&
        innovator.isActive
      ) {
        this.emails.push({
          templateId: EmailTypeEnum.INNOVATION_SUPPORT_STATUS_UPDATE_TO_INNOVATOR,
          to: {
            type: 'identityId',
            value: innovator.identityId || '',
            displayNameParam: 'display_name'
          },
          params: {
            // display_name: '', // This will be filled by the email-listener function.
            innovation_name: this.data.innovation?.name || '',
            organisation_name: this.data.requestUserAdditionalInfo?.organisation.name || '',
            support_status: TranslationHelper.translate(
              `SUPPORT_STATUS.${this.inputData.innovationSupport.status}`
            ).toLowerCase(),
            support_status_change_comment: this.inputData.innovationSupport.message,
            support_url: new UrlModel(ENV.webBaseTransactionalUrl)
              .addPath('innovator/innovations/:innovationId/support')
              .setPathParams({ innovationId: this.inputData.innovationId })
              .buildUrl()
          }
        });
      }
  }

  private async prepareEmailForNewAccessors(accessors?: { id: string }[]): Promise<void> {
    const recipients = await this.recipientsService.usersInfo(accessors?.map(a => a.id) ?? []);
    const uniqueRecipients = [...new Map(recipients.map(item => [item['id'], item])).values()];

    for (const recipient of uniqueRecipients) {
      this.emails.push({
        templateId: EmailTypeEnum.INNOVATION_SUPPORT_STATUS_UPDATE_TO_ASSIGNED_ACCESSORS,
        to: { type: 'identityId', value: recipient.identityId, displayNameParam: 'display_name' },
        params: {
          qa_name: this.data.requestUserAdditionalInfo?.displayName ?? 'qualified accessor', // what should the default be, believe it will never happen
          innovation_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('accessor/innovations/:innovationId')
            .setPathParams({ innovationId: this.inputData.innovationId })
            .buildUrl()
        }
      });
    }
  }

  private async prepareInAppForInnovator(): Promise<void> {
    // This never happens
    if (!this.data.innovation) {
      return;
    }

    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: {
        type: NotificationContextTypeEnum.SUPPORT,
        detail: NotificationContextDetailEnum.SUPPORT_STATUS_UPDATE,
        id: this.inputData.innovationSupport.id
      },
      userRoleIds: [this.data.innovation.owner.userRole.id],
      params: {
        organisationUnitName: this.data.requestUserAdditionalInfo?.organisationUnit.name || '',
        supportStatus: this.inputData.innovationSupport.status
      }
    });
  }

  private async prepareInAppForAccessorsWhenEngaging(): Promise<void> {
    const assignedUsers = await this.recipientsService.innovationAssignedUsers({
      innovationSupportId: this.inputData.innovationSupport.id
    });

    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: {
        type: NotificationContextTypeEnum.SUPPORT,
        detail: NotificationContextDetailEnum.SUPPORT_STATUS_UPDATE,
        id: this.inputData.innovationSupport.id
      },
      userRoleIds: assignedUsers
        .filter(user => user.userRole.id !== this.domainContext.currentRole.id)
        .map(user => user.userRole.id),
      params: {
        organisationUnitName: this.data.requestUserAdditionalInfo?.organisationUnit.name || '',
        supportStatus: this.inputData.innovationSupport.status
      }
    });
  }

  private async prepareInAppForAssessmentWhenWaitingStatus(): Promise<void> {
    const assessmentUsers = await this.recipientsService.needsAssessmentUsers();

    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: {
        type: NotificationContextTypeEnum.SUPPORT,
        detail: NotificationContextDetailEnum.SUPPORT_STATUS_UPDATE,
        id: this.inputData.innovationSupport.id
      },
      userRoleIds: assessmentUsers.map(item => item.roleId),
      params: {
        organisationUnitName: this.data.requestUserAdditionalInfo?.organisationUnit.name || '',
        supportStatus: this.inputData.innovationSupport.status
      }
    });
  }
}
