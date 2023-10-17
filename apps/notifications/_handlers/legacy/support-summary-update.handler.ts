import {
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
  ServiceRoleEnum,
  type NotifierTypeEnum
} from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { ENV, EmailTypeEnum } from '../../_config';
import type { RecipientType } from '../../_services/recipients.service';

import type { Context } from '@azure/functions';
import { UrlModel } from '@notifications/shared/models';
import { BaseHandler } from '../base.handler';

export class SupportSummaryUpdateHandler extends BaseHandler<
  NotifierTypeEnum.SUPPORT_SUMMARY_UPDATE,
  EmailTypeEnum.SUPPORT_SUMMARY_UPDATE_TO_INNOVATOR,
  { organisationUnitName: string }
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.SUPPORT_SUMMARY_UPDATE],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);
    const organisationUnit = await this.recipientsService.organisationUnitInfo(this.inputData.organisationUnitId);

    const innovationOwner = await this.recipientsService.getUsersRecipient(
      innovation.ownerId,
      ServiceRoleEnum.INNOVATOR
    );

    if (innovationOwner) {
      this.prepareEmailToInnovationOwner(innovationOwner, innovation.name, organisationUnit.organisationUnit.name);
      this.prepareInAppToInnovationOwner(innovationOwner.roleId, organisationUnit.organisationUnit.name);
    }

    const collaboratorIds = await this.recipientsService.getInnovationActiveCollaborators(this.inputData.innovationId);

    if (collaboratorIds.length) {
      const collaborators = await this.recipientsService.getUsersRecipient(collaboratorIds, ServiceRoleEnum.INNOVATOR);
      this.prepareEmailToCollaborators(collaborators, innovation.name, organisationUnit.organisationUnit.name);
      this.prepareInAppToCollaborators(collaborators, organisationUnit.organisationUnit.name);
    }

    return this;
  }

  prepareEmailToInnovationOwner(
    innovationOwner: RecipientType,
    innovationName: string,
    organisationUnitName: string
  ): void {
    this.emails.push({
      templateId: EmailTypeEnum.SUPPORT_SUMMARY_UPDATE_TO_INNOVATOR,
      notificationPreferenceType: null,
      to: innovationOwner,
      params: {
        innovation_name: innovationName,
        unit_name: organisationUnitName,
        support_summary_url: new UrlModel(ENV.webBaseTransactionalUrl)
          .addPath(':userBasePath/innovations/:innovationId/support-summary?unitId=:unitId')
          .setPathParams({
            userBasePath: this.frontendBaseUrl(innovationOwner.role),
            innovationId: this.inputData.innovationId,
            unitId: this.inputData.organisationUnitId
          })
          .buildUrl()
      }
    });
  }

  prepareInAppToInnovationOwner(innovationOwnerRoleId: string, organisationUnitName: string): void {
    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: {
        type: NotificationContextTypeEnum.SUPPORT,
        detail: NotificationContextDetailEnum.SUPPORT_SUMMARY_UPDATE,
        id: this.inputData.organisationUnitId
      },
      userRoleIds: [innovationOwnerRoleId],
      params: {
        organisationUnitName
      }
    });
  }

  prepareEmailToCollaborators(
    collaborators: RecipientType[],
    innovationName: string,
    organisationUnitName: string
  ): void {
    for (const collaborator of collaborators) {
      this.emails.push({
        templateId: EmailTypeEnum.SUPPORT_SUMMARY_UPDATE_TO_INNOVATOR,
        notificationPreferenceType: null,
        to: collaborator,
        params: {
          innovation_name: innovationName,
          unit_name: organisationUnitName,
          support_summary_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath(':userBasePath/innovations/:innovationId/support-summary?unitId=:unitId')
            .setPathParams({
              userBasePath: this.frontendBaseUrl(collaborator.role),
              innovationId: this.inputData.innovationId,
              unitId: this.inputData.organisationUnitId
            })
            .buildUrl()
        }
      });
    }
  }

  prepareInAppToCollaborators(collaborators: RecipientType[], organisationUnitName: string): void {
    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: {
        type: NotificationContextTypeEnum.SUPPORT,
        detail: NotificationContextDetailEnum.SUPPORT_SUMMARY_UPDATE,
        id: this.inputData.organisationUnitId
      },
      userRoleIds: collaborators.map(c => c.roleId),
      params: {
        organisationUnitName
      }
    });
  }
}
