import type { UserRoleEntity } from '@notifications/shared/entities';
import {
  EmailNotificationPreferenceEnum,
  EmailNotificationTypeEnum,
  InnovationActionStatusEnum,
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
  NotifierTypeEnum,
  ServiceRoleEnum
} from '@notifications/shared/enums';
import { EmailErrorsEnum, NotFoundError } from '@notifications/shared/errors';
import { UrlModel } from '@notifications/shared/models';
import {
  DomainServiceSymbol,
  DomainServiceType,
  IdentityProviderServiceSymbol,
  IdentityProviderServiceType
} from '@notifications/shared/services';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { container, EmailTypeEnum, ENV } from '../_config';
import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';

import type { CurrentCatalogTypes } from '@notifications/shared/schemas/innovation-record';
import { BaseHandler } from './base.handler';

export class ActionUpdateHandler extends BaseHandler<
  NotifierTypeEnum.ACTION_UPDATE,
  | EmailTypeEnum.ACTION_COMPLETED_TO_INNOVATOR
  | EmailTypeEnum.ACTION_REQUESTED_TO_INNOVATOR
  | EmailTypeEnum.ACTION_CANCELLED_TO_INNOVATOR
  | EmailTypeEnum.ACTION_DECLINED_CONFIRMATION
  | EmailTypeEnum.ACTION_SUBMITTED_CONFIRMATION
  | EmailTypeEnum.ACTION_RESPONDED_BY_COLLABORATOR_TO_OWNER
  | EmailTypeEnum.ACTION_SUBMITTED_TO_ACCESSOR_OR_ASSESSMENT
  | EmailTypeEnum.ACTION_DECLINED_TO_ACCESSOR_OR_ASSESSMENT,
  {
    actionCode: string;
    actionStatus: '' | InnovationActionStatusEnum;
    section: CurrentCatalogTypes.InnovationSections;
  }
> {
  private recipientsService = container.get<RecipientsServiceType>(RecipientsServiceSymbol);
  private domainService = container.get<DomainServiceType>(DomainServiceSymbol);
  private identityProviderService = container.get<IdentityProviderServiceType>(IdentityProviderServiceSymbol);

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
    actionInfo?: {
      id: string;
      displayId: string;
      status: InnovationActionStatusEnum;
      organisationUnit?: { id: string; name: string };
      owner: { id: string; identityId: string; roleId: string; role: ServiceRoleEnum };
    };
    comment?: string;
  } = {};

  constructor(
    requestUser: { id: string; identityId: string },
    data: NotifierTemplatesType[NotifierTypeEnum.ACTION_UPDATE],
    domainContext: DomainContextType
  ) {
    super(requestUser, data, domainContext);
  }

  async run(): Promise<this> {
    this.data.innovation = await this.recipientsService.innovationInfoWithOwner(this.inputData.innovationId);
    this.data.actionInfo = await this.recipientsService.actionInfoWithOwner(this.inputData.action.id);

    switch (this.domainContext.currentRole.role) {
      case ServiceRoleEnum.INNOVATOR:
        if (
          [InnovationActionStatusEnum.SUBMITTED, InnovationActionStatusEnum.DECLINED].includes(
            this.inputData.action.status
          )
        ) {
          await this.prepareEmailForAccessorOrAssessment();
          await this.prepareInAppForAccessorOrAssessment();
          await this.prepareConfirmationEmail();
          await this.prepareConfirmationInApp();
          // if action was submitted or declined by a collaborator notify owner
          if (this.domainContext.currentRole.id !== this.data.innovation.owner.userRole.id) {
            await this.prepareEmailForInnovationOwnerFromCollaborator();
            await this.prepareInAppForInnovationOwner();
          }
        }
        break;

      case ServiceRoleEnum.ACCESSOR:
      case ServiceRoleEnum.QUALIFYING_ACCESSOR:
      case ServiceRoleEnum.ASSESSMENT:
        if (
          [
            InnovationActionStatusEnum.COMPLETED,
            InnovationActionStatusEnum.REQUESTED,
            InnovationActionStatusEnum.CANCELLED,
            InnovationActionStatusEnum.DELETED
          ].includes(this.inputData.action.status)
        ) {
          await this.prepareEmailForInnovationOwner();
          await this.prepareInAppForInnovationOwner();
          if (
            this.inputData.action.previouslyUpdatedByUserRole &&
            this.inputData.action.previouslyUpdatedByUserRole.id !== this.data.innovation.owner.userRole.id
          ) {
            await this.prepareInAppForCollaborator();
          }
        }
        break;

      default:
        break;
    }

    return this;
  }

  // Private methods.

  private async prepareEmailForAccessorOrAssessment(): Promise<void> {
    const requestInfo = await this.domainService.users.getUserInfo({ userId: this.requestUser.id });

    // Don't send email to inactive users
    if (!requestInfo.isActive) {
      return;
    }

    let templateId: EmailTypeEnum;
    switch (this.data.actionInfo?.status) {
      case InnovationActionStatusEnum.SUBMITTED:
        templateId = EmailTypeEnum.ACTION_SUBMITTED_TO_ACCESSOR_OR_ASSESSMENT;
        break;
      case InnovationActionStatusEnum.DECLINED:
        templateId = EmailTypeEnum.ACTION_DECLINED_TO_ACCESSOR_OR_ASSESSMENT;
        break;
      default:
        throw new NotFoundError(EmailErrorsEnum.EMAIL_TEMPLATE_NOT_FOUND);
    }

    const path =
      this.data.actionInfo.owner.role === ServiceRoleEnum.ASSESSMENT
        ? 'assessment/innovations/:innovationId/action-tracker/:actionId'
        : 'accessor/innovations/:innovationId/action-tracker/:actionId';

    this.emails.push({
      templateId: templateId,
      to: {
        type: 'identityId',
        value: this.data.actionInfo.owner.identityId,
        displayNameParam: 'display_name'
      },
      params: {
        // display_name: '', // This will be filled by the email-listener function.
        innovator_name: requestInfo.displayName,
        innovation_name: this.data.innovation?.name ?? '',
        ...(templateId === EmailTypeEnum.ACTION_DECLINED_TO_ACCESSOR_OR_ASSESSMENT && {
          declined_action_reason: this.inputData.comment ?? ''
        }),
        action_url: new UrlModel(ENV.webBaseTransactionalUrl)
          .addPath(path)
          .setPathParams({
            innovationId: this.inputData.innovationId,
            actionId: this.inputData.action.id
          })
          .buildUrl()
      }
    });
  }

  private async prepareEmailForInnovationOwner(): Promise<void> {
    // This never happens
    if (!this.data.innovation) {
      return;
    }

    if (
      this.isEmailPreferenceInstantly(
        EmailNotificationTypeEnum.ACTION,
        this.data.innovation.owner.emailNotificationPreferences
      ) &&
      this.data.innovation.owner.isActive
    ) {
      let templateId: EmailTypeEnum;
      switch (this.data.actionInfo?.status) {
        case InnovationActionStatusEnum.REQUESTED:
          templateId = EmailTypeEnum.ACTION_REQUESTED_TO_INNOVATOR;
          break;
        case InnovationActionStatusEnum.COMPLETED:
          templateId = EmailTypeEnum.ACTION_COMPLETED_TO_INNOVATOR;
          break;
        case InnovationActionStatusEnum.CANCELLED:
          templateId = EmailTypeEnum.ACTION_CANCELLED_TO_INNOVATOR;
          break;
        default:
          throw new NotFoundError(EmailErrorsEnum.EMAIL_TEMPLATE_NOT_FOUND);
      }

      const requestInfo = await this.identityProviderService.getUserInfo(this.requestUser.identityId);

      let accessor_name = requestInfo.displayName;
      let unit_name =
        this.domainContext.currentRole.role === ServiceRoleEnum.ASSESSMENT
          ? 'needs assessment'
          : this.domainContext?.organisation?.organisationUnit?.name ?? '';

      this.emails.push({
        templateId,
        to: {
          type: 'identityId',
          value: this.data.innovation?.owner.identityId || '',
          displayNameParam: 'display_name'
        },
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          accessor_name: accessor_name,
          unit_name: unit_name,
          action_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('innovator/innovations/:innovationId/action-tracker/:actionId')
            .setPathParams({
              innovationId: this.inputData.innovationId,
              actionId: this.inputData.action.id
            })
            .buildUrl()
        }
      });
    }
  }

  private async prepareEmailForInnovationOwnerFromCollaborator(): Promise<void> {
    // This never happens
    if (!this.data.innovation) {
      return;
    }

    if (
      this.isEmailPreferenceInstantly(
        EmailNotificationTypeEnum.ACTION,
        this.data.innovation.owner.emailNotificationPreferences
      ) &&
      this.data.innovation.owner.isActive
    ) {
      let templateId: EmailTypeEnum;
      switch (this.data.actionInfo?.status) {
        case InnovationActionStatusEnum.SUBMITTED:
        case InnovationActionStatusEnum.DECLINED:
          templateId = EmailTypeEnum.ACTION_RESPONDED_BY_COLLABORATOR_TO_OWNER;
          break;
        default:
          throw new NotFoundError(EmailErrorsEnum.EMAIL_TEMPLATE_NOT_FOUND);
      }

      const requestInfo = await this.identityProviderService.getUserInfo(this.requestUser.identityId);

      const actionOwnerInfo = await this.domainService.users.getUserInfo({
        userId: this.data.actionInfo.owner.id
      });
      const actionOwnerUnitName =
        this.data.actionInfo.owner.role === ServiceRoleEnum.ASSESSMENT
          ? 'needs assessment'
          : this.data.actionInfo.organisationUnit?.name || '';

      this.emails.push({
        templateId,
        to: {
          type: 'identityId',
          value: this.data.innovation?.owner.identityId || '',
          displayNameParam: 'display_name'
        },
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          collaborator_name: requestInfo.displayName,
          accessor_name: actionOwnerInfo.displayName,
          unit_name: actionOwnerUnitName,
          action_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('innovator/innovations/:innovationId/action-tracker/:actionId')
            .setPathParams({
              innovationId: this.inputData.innovationId,
              actionId: this.inputData.action.id
            })
            .buildUrl()
        }
      });
    }
  }

  private async prepareConfirmationEmail(): Promise<void> {
    // This never happens
    if (!this.data.innovation) {
      return;
    }

    const requestUserInfo = await this.recipientsService.userInfo(this.requestUser.id);

    if (
      this.isEmailPreferenceInstantly(EmailNotificationTypeEnum.ACTION, requestUserInfo.emailNotificationPreferences) &&
      requestUserInfo.isActive
    ) {
      let templateId: EmailTypeEnum;
      switch (this.data.actionInfo?.status) {
        case InnovationActionStatusEnum.SUBMITTED:
          templateId = EmailTypeEnum.ACTION_SUBMITTED_CONFIRMATION;
          break;
        case InnovationActionStatusEnum.DECLINED:
          templateId = EmailTypeEnum.ACTION_DECLINED_CONFIRMATION;
          break;
        default:
          throw new NotFoundError(EmailErrorsEnum.EMAIL_TEMPLATE_NOT_FOUND);
      }

      const actionOwnerInfo = await this.identityProviderService.getUserInfo(this.data.actionInfo.owner.identityId);

      this.emails.push({
        templateId,
        to: {
          type: 'identityId',
          value: requestUserInfo.identityId || '',
          displayNameParam: 'display_name'
        },
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          accessor_name: actionOwnerInfo.displayName,
          unit_name:
            this.data.actionInfo.owner.role === ServiceRoleEnum.ASSESSMENT
              ? 'needs assessment'
              : this.data.actionInfo.organisationUnit?.name || '',
          action_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('innovator/innovations/:innovationId/action-tracker/:actionId')
            .setPathParams({
              innovationId: this.inputData.innovationId,
              actionId: this.inputData.action.id
            })
            .buildUrl()
        }
      });
    }
  }

  private async prepareInAppForAccessorOrAssessment(): Promise<void> {
    // This should never happen
    if (!this.data.actionInfo) {
      return;
    }

    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: {
        type: NotificationContextTypeEnum.ACTION,
        detail: NotificationContextDetailEnum.ACTION_UPDATE,
        id: this.inputData.action.id
      },
      userRoleIds: [this.data.actionInfo.owner.roleId],
      params: {
        actionCode: this.data.actionInfo?.displayId || '',
        actionStatus: this.inputData.action.status, // We use here the supplied action status, NOT the action status from query.
        section: this.inputData.action.section
      }
    });
  }

  private async prepareInAppForInnovationOwner(): Promise<void> {
    // This never happens
    if (!this.data.innovation?.owner) {
      return;
    }

    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: {
        type: NotificationContextTypeEnum.ACTION,
        detail: NotificationContextDetailEnum.ACTION_UPDATE,
        id: this.inputData.action.id
      },
      userRoleIds: [this.data.innovation.owner.userRole.id],
      params: {
        actionCode: this.data.actionInfo?.displayId || '',
        actionStatus: this.inputData.action.status, // We use here the supplied action status, NOT the action status from query.
        section: this.inputData.action.section
      }
    });
  }

  private async prepareInAppForCollaborator(): Promise<void> {
    // This should never happen
    if (!this.inputData.action.previouslyUpdatedByUserRole) {
      return;
    }

    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: {
        type: NotificationContextTypeEnum.ACTION,
        detail: NotificationContextDetailEnum.ACTION_UPDATE,
        id: this.inputData.action.id
      },
      userRoleIds: [this.inputData.action.previouslyUpdatedByUserRole.id],
      params: {
        actionCode: this.data.actionInfo?.displayId || '',
        actionStatus: this.inputData.action.status, // We use here the supplied action status, NOT the action status from query.
        section: this.inputData.action.section
      }
    });
  }

  private async prepareConfirmationInApp(): Promise<void> {
    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: {
        type: NotificationContextTypeEnum.ACTION,
        detail: NotificationContextDetailEnum.ACTION_UPDATE,
        id: this.inputData.action.id
      },
      userRoleIds: [this.domainContext.currentRole.id],
      params: {
        actionCode: this.data.actionInfo?.displayId || '',
        actionStatus: this.inputData.action.status, // We use here the supplied action status, NOT the action status from query.
        section: this.inputData.action.section
      }
    });
  }
}
