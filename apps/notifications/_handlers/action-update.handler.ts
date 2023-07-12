import {
  InnovationActionStatusEnum,
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
  NotifierTypeEnum,
  ServiceRoleEnum
} from '@notifications/shared/enums';
import { EmailErrorsEnum, NotFoundError } from '@notifications/shared/errors';
import { UrlModel } from '@notifications/shared/models';
import type { IdentityProviderService } from '@notifications/shared/services';
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
  private identityProviderService = container.get<IdentityProviderService>(SHARED_SYMBOLS.IdentityProviderService);

  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.ACTION_UPDATE],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const innovationInfo = await this.recipientsService.innovationInfo(this.inputData.innovationId);
    const owner = await this.recipientsService.getUsersRecipient(innovationInfo.ownerId, ServiceRoleEnum.INNOVATOR);

    const actionInfo = await this.recipientsService.actionInfoWithOwner(this.inputData.action.id);

    const innovation = { id: this.inputData.innovationId, name: innovationInfo.name, owner: owner };

    const action = {
      ...actionInfo,
      status: this.inputData.action.status, // we want here the status provided when triggering the notification
      section: this.inputData.action.section
    };

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
          await this.prepareEmailForAccessorOrAssessment(innovation, action);
          await this.prepareInAppForAccessorOrAssessment(action);
          if (requestUser) {
            await this.prepareConfirmationEmail(requestUser, action);
            await this.prepareConfirmationInApp(action);
          }

          if (innovation.owner) {
            await this.prepareInAppForInnovationOwner(
              { id: innovation.id, owner: innovation.owner },
             action 
            );

            // if action was submitted or declined by a collaborator notify owner
            if (this.requestUser.currentRole.id !== innovation.owner.roleId) {
              await this.prepareEmailForInnovationOwnerFromCollaborator(
                { id: innovation.id, owner: innovation.owner },
               action 
              );
            }
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
            InnovationActionStatusEnum.CANCELLED
            // InnovationActionStatusEnum.DELETED
          ].includes(this.inputData.action.status)
        ) {
          if (innovation.owner) {
            await this.prepareEmailForInnovationOwner(
              { id: innovation.id, owner: innovation.owner },
             action 
            );
            await this.prepareInAppForInnovationOwner(
              { id: innovation.id, owner: innovation.owner },
             action 
            );
          }
          // check if action was submitted by a collaborator
          if (
            this.inputData.action.previouslyUpdatedByUserRole &&
            this.inputData.action.previouslyUpdatedByUserRole.id !== innovation.owner?.roleId &&
            this.inputData.action.previouslyUpdatedByUserRole.role === ServiceRoleEnum.INNOVATOR
          ) {
            await this.prepareInAppForCollaborator({
              ...action,
              previouslyUpdatedByUserRole: this.inputData.action.previouslyUpdatedByUserRole
            });
          }
        }
        break;

      default:
        break;
    }

    return this;
  }

  // Private methods.

  private async prepareEmailForAccessorOrAssessment(
    innovation: { id: string; name: string },
    action: { id: string; status: InnovationActionStatusEnum; owner: RecipientType }
  ): Promise<void> {
    const requestInfo = await this.identityProviderService.getUserInfo(this.requestUser.identityId);

    let templateId: EmailTypeEnum;
    switch (action.status) {
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
      action.owner.role === ServiceRoleEnum.ASSESSMENT
        ? 'assessment/innovations/:innovationId/action-tracker/:actionId'
        : 'accessor/innovations/:innovationId/action-tracker/:actionId';

    this.emails.push({
      templateId: templateId,
      to: action.owner,
      notificationPreferenceType: 'ACTION',
      params: {
        // display_name: '', // This will be filled by the email-listener function.
        innovator_name: requestInfo.displayName,
        innovation_name: innovation.name,
        ...(templateId === EmailTypeEnum.ACTION_DECLINED_TO_ACCESSOR_OR_ASSESSMENT && {
          declined_action_reason: this.inputData.comment ?? ''
        }),
        action_url: new UrlModel(ENV.webBaseTransactionalUrl)
          .addPath(path)
          .setPathParams({
            innovationId: innovation.id,
            actionId: action.id
          })
          .buildUrl()
      }
    });
  }

  private async prepareEmailForInnovationOwner(
    innovation: { id: string; owner: RecipientType },
    action: { id: string; status: InnovationActionStatusEnum; owner: RecipientType }
  ): Promise<void> {
    let templateId: EmailTypeEnum;
    switch (action.status) {
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
        : this.requestUser.organisation?.organisationUnit?.name ?? '';

    this.emails.push({
      templateId,
      notificationPreferenceType: 'ACTION',
      to: innovation.owner,
      params: {
        accessor_name: accessor_name,
        unit_name: unit_name,
        action_url: new UrlModel(ENV.webBaseTransactionalUrl)
          .addPath('innovator/innovations/:innovationId/action-tracker/:actionId')
          .setPathParams({
            innovationId: innovation.id,
            actionId: action.id
          })
          .buildUrl()
      }
    });
  }

  private async prepareEmailForInnovationOwnerFromCollaborator(
    innovation: { id: string; owner: RecipientType },
    action: { id: string; status: InnovationActionStatusEnum; owner: RecipientType; organisationUnit?: { name: string }}
  ): Promise<void> {
    let templateId: EmailTypeEnum;
    switch (action.status) {
      case InnovationActionStatusEnum.SUBMITTED:
      case InnovationActionStatusEnum.DECLINED:
        templateId = EmailTypeEnum.ACTION_RESPONDED_BY_COLLABORATOR_TO_OWNER;
        break;
      default:
        throw new NotFoundError(EmailErrorsEnum.EMAIL_TEMPLATE_NOT_FOUND);
    }

    const requestInfo = await this.identityProviderService.getUserInfo(this.requestUser.identityId);

    const actionOwnerInfo = await this.recipientsService.usersIdentityInfo(action.owner.identityId);
    const actionOwnerUnitName =
      action.owner.role === ServiceRoleEnum.ASSESSMENT
        ? 'needs assessment'
        : action.organisationUnit?.name || '';

    this.emails.push({
      templateId,
      notificationPreferenceType: 'ACTION',
      to: innovation.owner,
      params: {
        // display_name: '', // This will be filled by the email-listener function.
        collaborator_name: requestInfo.displayName,
        accessor_name: actionOwnerInfo?.displayName ?? 'user', // Review what should happen if user is not found
        unit_name: actionOwnerUnitName,
        action_url: new UrlModel(ENV.webBaseTransactionalUrl)
          .addPath('innovator/innovations/:innovationId/action-tracker/:actionId')
          .setPathParams({
            innovationId: innovation.id,
            actionId: action.id
          })
          .buildUrl()
      }
    });
  }

  private async prepareConfirmationEmail(
    innovator: RecipientType,
    action: {
      id: string;
      status: InnovationActionStatusEnum;
      owner: RecipientType;
      organisationUnit?: { name: string };
    }
  ): Promise<void> {
    let templateId: EmailTypeEnum;
    switch (action.status) {
      case InnovationActionStatusEnum.SUBMITTED:
        templateId = EmailTypeEnum.ACTION_SUBMITTED_CONFIRMATION;
        break;
      case InnovationActionStatusEnum.DECLINED:
        templateId = EmailTypeEnum.ACTION_DECLINED_CONFIRMATION;
        break;
      default:
        throw new NotFoundError(EmailErrorsEnum.EMAIL_TEMPLATE_NOT_FOUND);
    }

    const actionOwnerInfo = await this.identityProviderService.getUserInfo(action.owner.identityId);

    this.emails.push({
      templateId,
      notificationPreferenceType: 'ACTION',
      to: innovator,
      params: {
        // display_name: '', // This will be filled by the email-listener function.
        accessor_name: actionOwnerInfo.displayName,
        unit_name:
          action.owner.role === ServiceRoleEnum.ASSESSMENT ? 'needs assessment' : action.organisationUnit?.name || '',
        action_url: new UrlModel(ENV.webBaseTransactionalUrl)
          .addPath('innovator/innovations/:innovationId/action-tracker/:actionId')
          .setPathParams({
            innovationId: this.inputData.innovationId,
            actionId: action.id
          })
          .buildUrl()
      }
    });
  }

  private async prepareInAppForAccessorOrAssessment(action: {
    id: string;
    status: InnovationActionStatusEnum;
    displayId: string;
    section: CurrentCatalogTypes.InnovationSections;
    owner: RecipientType;
  }): Promise<void> {
    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: {
        type: NotificationContextTypeEnum.ACTION,
        detail: NotificationContextDetailEnum.ACTION_UPDATE,
        id: action.id
      },
      userRoleIds: [action.owner.roleId],
      params: {
        actionCode: action.displayId,
        actionStatus: action.status, // We use here the supplied action status, NOT the action status from query.
        section: action.section
      }
    });
  }

  private async prepareInAppForInnovationOwner(
    innovation: { id: string; owner: RecipientType },
    action: {
      id: string;
      status: InnovationActionStatusEnum;
      displayId: string;
      section: CurrentCatalogTypes.InnovationSections;
    }
  ): Promise<void> {
    this.inApp.push({
      innovationId: innovation.id,
      context: {
        type: NotificationContextTypeEnum.ACTION,
        detail: NotificationContextDetailEnum.ACTION_UPDATE,
        id: action.id
      },
      userRoleIds: [innovation.owner.roleId],
      params: {
        actionCode: action.displayId,
        actionStatus: action.status, // We use here the supplied action status, NOT the action status from query.
        section: action.section
      }
    });
  }

  private async prepareInAppForCollaborator(action: {
    id: string;
    status: InnovationActionStatusEnum;
    displayId: string;
    section: CurrentCatalogTypes.InnovationSections;
    previouslyUpdatedByUserRole: { id: string };
  }): Promise<void> {
    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: {
        type: NotificationContextTypeEnum.ACTION,
        detail: NotificationContextDetailEnum.ACTION_UPDATE,
        id: this.inputData.action.id
      },
      userRoleIds: [action.previouslyUpdatedByUserRole.id],
      params: {
        actionCode: action.displayId,
        actionStatus: action.status, // We use here the supplied action status, NOT the action status from query.
        section: action.section
      }
    });
  }

  private async prepareConfirmationInApp(action: {
    id: string;
    status: InnovationActionStatusEnum;
    displayId: string;
    section: CurrentCatalogTypes.InnovationSections;
  }): Promise<void> {
    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: {
        type: NotificationContextTypeEnum.ACTION,
        detail: NotificationContextDetailEnum.ACTION_UPDATE,
        id: action.id
      },
      userRoleIds: [this.requestUser.currentRole.id],
      params: {
        actionCode: action.displayId,
        actionStatus: action.status,
        section: action.section
      }
    });
  }
}
