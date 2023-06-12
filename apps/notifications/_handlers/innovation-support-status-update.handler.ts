import {
  InnovationSupportStatusEnum,
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
  NotifierTypeEnum,
  ServiceRoleEnum
} from '@notifications/shared/enums';
import { TranslationHelper } from '@notifications/shared/helpers';
import { UrlModel } from '@notifications/shared/models';
import type { DomainService } from '@notifications/shared/services';
import SHARED_SYMBOLS from '@notifications/shared/services/symbols';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { container, EmailTypeEnum, ENV } from '../_config';

import type { Context } from '@azure/functions';
import type { RecipientType } from '../_services/recipients.service';
import { BaseHandler } from './base.handler';

export class InnovationSupportStatusUpdateHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_SUPPORT_STATUS_UPDATE,
  | EmailTypeEnum.INNOVATION_SUPPORT_STATUS_UPDATE_TO_INNOVATOR
  | EmailTypeEnum.INNOVATION_SUPPORT_STATUS_UPDATE_TO_ASSIGNED_ACCESSORS,
  { organisationUnitName: string; supportStatus: InnovationSupportStatusEnum }
> {
  private domainService = container.get<DomainService>(SHARED_SYMBOLS.DomainService);

  private data: {
    innovation?: {
      name: string;
      owner: RecipientType | null;
    };
    requestUserAdditionalInfo?: {
      displayName?: string;
      organisation: { id: string; name: string };
      organisationUnit: { id: string; name: string };
    };
  } = {};

  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_SUPPORT_STATUS_UPDATE],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const requestUserInfo = await this.domainService.users.getUserInfo({
      userId: this.requestUser.id
    });

    const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);
    const owner = await this.recipientsService.getUsersRecipient(innovation.ownerId, ServiceRoleEnum.INNOVATOR);
    this.data.innovation = {
      name: innovation.name,
      owner: owner
    };

    const collaborators = await this.recipientsService.getInnovationActiveCollaborators(this.inputData.innovationId);
    const innovatorRecipients = await this.recipientsService.getUsersRecipient(
      collaborators,
      ServiceRoleEnum.INNOVATOR
    );

    if (owner?.isActive) {
      innovatorRecipients.push(owner);
    }

    this.data.requestUserAdditionalInfo = {
      displayName: requestUserInfo.displayName,
      organisation: {
        id: this.requestUser.organisation?.id ?? '',
        name: this.requestUser.organisation?.name ?? ''
      },
      organisationUnit: {
        id: this.requestUser?.organisation?.organisationUnit?.id ?? '',
        name: this.requestUser?.organisation?.organisationUnit?.name ?? ''
      }
    };

    // If the innovation is not found, then we don't need to send any notification. (This could probably throw an error as it should not happen, but leaving like this.)
    if (!this.data.innovation) {
      return this;
    }

    if (this.inputData.innovationSupport.statusChanged) {
      await this.prepareEmailForInnovators(innovatorRecipients);
      await this.prepareInAppForInnovators(innovatorRecipients.map(i => i.roleId));

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
      await this.prepareEmailForNewAccessors();
    }

    return this;
  }

  // Private methods.
  private async prepareEmailForInnovators(recipients: RecipientType[]): Promise<void> {
    // Send email only to user if email preference INSTANTLY (NotifierTypeEnum.SUPPORT).
    for (const recipient of recipients) {
      this.emails.push({
        templateId: EmailTypeEnum.INNOVATION_SUPPORT_STATUS_UPDATE_TO_INNOVATOR,
        notificationPreferenceType: 'SUPPORT',
        to: recipient,
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

  private async prepareEmailForNewAccessors(): Promise<void> {
    const newAssignedAccessors = (
      this.inputData.innovationSupport.newAssignedAccessors?.filter(a => a.id !== this.requestUser.id) ?? []
    ).map(a => a.id);

    const recipients = await this.recipientsService.getUsersRecipient(
      newAssignedAccessors,
      [ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR],
      {
        organisationUnit: this.inputData.innovationSupport.organisationUnitId
      }
    );

    for (const recipient of recipients) {
      this.emails.push({
        templateId: EmailTypeEnum.INNOVATION_SUPPORT_STATUS_UPDATE_TO_ASSIGNED_ACCESSORS,
        notificationPreferenceType: 'SUPPORT',
        to: recipient,
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

  private async prepareInAppForInnovators(roleIds: string[]): Promise<void> {
    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: {
        type: NotificationContextTypeEnum.SUPPORT,
        detail: NotificationContextDetailEnum.SUPPORT_STATUS_UPDATE,
        id: this.inputData.innovationSupport.id
      },
      userRoleIds: roleIds,
      params: {
        organisationUnitName: this.data.requestUserAdditionalInfo?.organisationUnit.name || '',
        supportStatus: this.inputData.innovationSupport.status
      }
    });
  }

  private async prepareInAppForAccessorsWhenEngaging(): Promise<void> {
    const assignedUsers = await this.recipientsService.innovationAssignedRecipients({
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
        .filter(user => user.roleId !== this.requestUser.currentRole.id)
        .map(user => user.roleId),
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
