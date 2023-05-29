import {
  InnovationActionStatusEnum,
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
  NotifierTypeEnum,
  ServiceRoleEnum
} from '@notifications/shared/enums';
import { EmailErrorsEnum, InnovationErrorsEnum, NotFoundError } from '@notifications/shared/errors';
import { UrlModel } from '@notifications/shared/models';
import type { DomainService, IdentityProviderService } from '@notifications/shared/services';
import SHARED_SYMBOLS from '@notifications/shared/services/symbols';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { container, EmailTypeEnum, ENV } from '../_config';

import type { Context } from '@azure/functions';
import type { CurrentCatalogTypes } from '@notifications/shared/schemas/innovation-record';
import type { RecipientType } from '../_services/recipients.service';
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
  private domainService = container.get<DomainService>(SHARED_SYMBOLS.DomainService);
  private identityProviderService = container.get<IdentityProviderService>(SHARED_SYMBOLS.IdentityProviderService);

  private data: {
    innovation?: {
      name: string;
      owner: RecipientType;
    };
    actionInfo?: {
      id: string;
      displayId: string;
      status: InnovationActionStatusEnum;
      organisationUnit?: { id: string; name: string };
      owner: RecipientType;
    };
    comment?: string;
  } = {};

  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.ACTION_UPDATE],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);
    const owner = await this.recipientsService.getUsersRecipient(innovation.ownerId, ServiceRoleEnum.INNOVATOR);
    if (!owner) throw new NotFoundError(InnovationErrorsEnum.INNOVATION_OWNER_NOT_FOUND);

    this.data.innovation = { name: innovation.name, owner: owner };
    this.data.actionInfo = await this.recipientsService.actionInfoWithOwner(this.inputData.action.id);

    switch (this.requestUser.currentRole.role) {
      case ServiceRoleEnum.INNOVATOR:
        if (
          [InnovationActionStatusEnum.SUBMITTED, InnovationActionStatusEnum.DECLINED].includes(
            this.inputData.action.status
          )
        ) {
          const requestUser = await this.recipientsService.getUsersRecipient(
            this.requestUser.id,
            this.requestUser.currentRole.role
          );
          await this.prepareEmailForAccessorOrAssessment();
          await this.prepareInAppForAccessorOrAssessment();
          if (requestUser) {
            await this.prepareConfirmationEmail(requestUser);
            await this.prepareConfirmationInApp();
          }
          // if action was submitted or declined by a collaborator notify owner
          if (this.requestUser.currentRole.id !== this.data.innovation.owner.roleId) {
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
          // check if action was submitted by a collaborator
          if (
            this.inputData.action.previouslyUpdatedByUserRole &&
            this.inputData.action.previouslyUpdatedByUserRole.id !== this.data.innovation.owner.roleId &&
            this.inputData.action.previouslyUpdatedByUserRole.role === ServiceRoleEnum.INNOVATOR
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
      to: this.data.actionInfo.owner,
      notificationPreferenceType: 'ACTION',
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

    const accessor_name = requestInfo.displayName;
    const unit_name =
      this.requestUser.currentRole.role === ServiceRoleEnum.ASSESSMENT
        ? 'needs assessment'
        : this.requestUser?.organisation?.organisationUnit?.name ?? '';

    this.emails.push({
      templateId,
      notificationPreferenceType: 'ACTION',
      to: this.data.innovation.owner,
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

  private async prepareEmailForInnovationOwnerFromCollaborator(): Promise<void> {
    // This never happens
    if (!this.data.innovation) {
      return;
    }

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

    const actionOwnerInfo = await this.recipientsService.usersIdentityInfo(this.data.actionInfo.owner.identityId);
    const actionOwnerUnitName =
      this.data.actionInfo.owner.role === ServiceRoleEnum.ASSESSMENT
        ? 'needs assessment'
        : this.data.actionInfo.organisationUnit?.name || '';

    this.emails.push({
      templateId,
      notificationPreferenceType: 'ACTION',
      to: this.data.innovation.owner,
      params: {
        // display_name: '', // This will be filled by the email-listener function.
        collaborator_name: requestInfo.displayName,
        accessor_name: actionOwnerInfo?.displayName ?? 'user', // Review what should happen if user is not found
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

  private async prepareConfirmationEmail(innovator: RecipientType): Promise<void> {
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
      notificationPreferenceType: 'ACTION',
      to: innovator,
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
      userRoleIds: [this.data.innovation.owner.roleId],
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
      userRoleIds: [this.requestUser.currentRole.id],
      params: {
        actionCode: this.data.actionInfo?.displayId || '',
        actionStatus: this.inputData.action.status, // We use here the supplied action status, NOT the action status from query.
        section: this.inputData.action.section
      }
    });
  }
}
