import {
  ServiceRoleEnum,
  type NotifierTypeEnum,
  NotificationContextTypeEnum,
  NotificationContextDetailEnum
} from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { ENV } from '../_config';
import { EmailTypeEnum } from '../_config/emails.config';

import { BaseHandler } from './base.handler';
import type { Context } from '@azure/functions';
import type { RecipientType } from '../_services/recipients.service';

export class InnovationOrganisationUnitsSuggestionHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_ORGANISATION_UNITS_SUGGESTION,
  EmailTypeEnum.ORGANISATION_SUGGESTION_TO_QA | EmailTypeEnum.ORGANISATION_SUGGESTION_NOT_SHARED_TO_INNOVATOR,
  Record<string, never>
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_ORGANISATION_UNITS_SUGGESTION],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    // Retrieve innovation shared organisations units
    const sharedOrganisations = await this.recipientsService.innovationSharedOrganisationsWithUnits(
      this.inputData.innovationId
    );
    const sharedOrganisationUnitsIds = sharedOrganisations.flatMap(organisation =>
      organisation.organisationUnits.map(unit => unit.id)
    );

    const suggestedSharedOrganisationUnitsIds = sharedOrganisationUnitsIds.filter(id =>
      this.inputData.organisationUnitIds.includes(id)
    );
    const suggestedSharedOrganisationUnitsUsers = await this.recipientsService.organisationUnitsQualifyingAccessors(
      suggestedSharedOrganisationUnitsIds
    );

    const hasOrganisationsSuggestedNotSharedWith = this.inputData.organisationUnitIds.length > suggestedSharedOrganisationUnitsIds.length;

    if (hasOrganisationsSuggestedNotSharedWith) {
      const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);
      if (innovation.ownerId) {
        const ownerRecipient = await this.recipientsService.getUsersRecipient(
          innovation.ownerId,
          ServiceRoleEnum.INNOVATOR
        );
        if (ownerRecipient) {
          this.prepareOrganisationsSuggestedNotSharedNotificationToOwner(ownerRecipient, innovation.name);
        }
      }

      const collaborators = await this.recipientsService.getInnovationActiveCollaborators(this.inputData.innovationId);
      const collaboratorRecipients = await this.recipientsService.getUsersRecipient(
        collaborators,
        ServiceRoleEnum.INNOVATOR
      );

      this.prepareOrganisationsSuggestedNotSharedNotificationToCollaborators(collaboratorRecipients, innovation.name);
    }

    this.prepareOrganisationsSuggestedSharedWithNotificationToUnitUsers(suggestedSharedOrganisationUnitsUsers);

    return this;
  }

  prepareOrganisationsSuggestedSharedWithNotificationToUnitUsers(unitRecipients: RecipientType[]): void {
    for (const user of unitRecipients) {
      this.emails.push({
        templateId: EmailTypeEnum.ORGANISATION_SUGGESTION_TO_QA,
        to: user,
        notificationPreferenceType: null,
        params: {
          innovation_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('accessor/innovations/:innovationId')
            .setPathParams({ innovationId: this.inputData.innovationId })
            .buildUrl()
        }
      });
    }
  }

  prepareOrganisationsSuggestedNotSharedNotificationToOwner(
    ownerRecipient: RecipientType,
    innovationName: string
  ): void {
    this.emails.push({
      templateId: EmailTypeEnum.ORGANISATION_SUGGESTION_NOT_SHARED_TO_INNOVATOR,
      to: ownerRecipient,
      notificationPreferenceType: null,
      params: {
        innovation_name: innovationName,
        data_sharing_url: new UrlModel(ENV.webBaseTransactionalUrl)
          .addPath('innovator/innovations/:innovationId/support')
          .setPathParams({ innovationId: this.inputData.innovationId })
          .buildUrl()
      }
    });

    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: {
        type: NotificationContextTypeEnum.DATA_SHARING,
        detail: NotificationContextDetailEnum.INNOVATION_ORGANISATION_SUGGESTION_NOT_SHARED,
        id: this.inputData.innovationId
      },
      userRoleIds: [ownerRecipient.roleId],
      params: {}
    });
  }

  prepareOrganisationsSuggestedNotSharedNotificationToCollaborators(collaboratorRecipients: RecipientType[], innovationName: string): void {
    for (const recipient of collaboratorRecipients) {
      this.emails.push({
        templateId: EmailTypeEnum.ORGANISATION_SUGGESTION_NOT_SHARED_TO_INNOVATOR,
        to: recipient,
        notificationPreferenceType: null,
        params: {
          innovation_name: innovationName,
          data_sharing_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('innovator/innovations/:innovationId/support')
            .setPathParams({ innovationId: this.inputData.innovationId })
            .buildUrl()
        }
      });
    }

    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: {
        type: NotificationContextTypeEnum.DATA_SHARING,
        detail: NotificationContextDetailEnum.INNOVATION_ORGANISATION_SUGGESTION_NOT_SHARED,
        id: this.inputData.innovationId
      },
      userRoleIds: collaboratorRecipients.map(r => r.roleId),
      params: {}
    });
  }
}
