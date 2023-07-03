import {
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
  NotifierTypeEnum,
  ServiceRoleEnum
} from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { EmailTypeEnum, ENV } from '../_config';

import type { RecipientType } from '../_services/recipients.service';
import { BaseHandler } from './base.handler';
import type { Context } from '@azure/functions';

export class NeedsAssessmentCompletedHandler extends BaseHandler<
  NotifierTypeEnum.NEEDS_ASSESSMENT_COMPLETED,
  | EmailTypeEnum.NEEDS_ASSESSMENT_COMPLETED_TO_INNOVATOR
  | EmailTypeEnum.ORGANISATION_SUGGESTION_TO_QA
  | EmailTypeEnum.NEEDS_ASSESSMENT_SUGGESTED_ORG_NOT_SHARED_TO_INNOVATOR,
  Record<string, never>
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.NEEDS_ASSESSMENT_COMPLETED],
    azureContext: Context
) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);
    const owner = await this.recipientsService.getUsersRecipient(innovation.ownerId, ServiceRoleEnum.INNOVATOR);
    const sharedOrganisations = await this.recipientsService.innovationSharedOrganisationsWithUnits(
      this.inputData.innovationId
    );

    const collaborators = await this.recipientsService.getInnovationActiveCollaborators(this.inputData.innovationId);
    const innovatorRecipients = await this.recipientsService.getUsersRecipient(
      collaborators,
      ServiceRoleEnum.INNOVATOR
    );

    if (owner?.isActive) {
      innovatorRecipients.push(owner);
    }

    // Assessment completed notifications for innovators (owner + collaborators)
    await this.prepareAssessmentCompletedEmailToInnovators(innovatorRecipients, innovation.name);
    await this.prepareAssessmentCompletedInAppToInnovators(innovatorRecipients.map(i => i.roleId));

    // Notifications for innovators (owner + collaborators) when there are suggested orgs not shared with
    const sharedOrganisationUnitsIds = sharedOrganisations.flatMap(organisation =>
      organisation.organisationUnits.map(unit => unit.id)
    );
    const organisationUnitsSuggestedNotSharedIds = this.inputData.organisationUnitIds.filter(
      item => !sharedOrganisationUnitsIds.includes(item)
    );
    if (organisationUnitsSuggestedNotSharedIds.length > 0) {
      await this.prepareOrganisationSuggestedNotSharedEmailToInnovators(innovatorRecipients, innovation.name);
      await this.prepareOrganisationSuggestedNotSharedInAppToInnovators(innovatorRecipients.map(i => i.roleId));
    }

    // Notifications for Qualifying Accessors
    const organisationUnitsSuggestedAndSharedIds = this.inputData.organisationUnitIds.filter(item =>
      sharedOrganisationUnitsIds.includes(item)
    );
    const organisationUnitsSuggestedAndSharedQAs = await this.recipientsService.organisationUnitsQualifyingAccessors(
      organisationUnitsSuggestedAndSharedIds
    );

    // TODO: Duplicated emails without reference to unit Id. Filtering unique users for now, maybe use unit in the future
    const emailRecipientQAIdentityIds = [
      ...new Map(organisationUnitsSuggestedAndSharedQAs.map(item => [item.identityId, item])).values()
    ];

    await this.prepareSuggestedAndSharedOrganisationEmailToQAs(emailRecipientQAIdentityIds);
    await this.prepareSuggestedAndSharedOrganisationInAppToQAs(
      organisationUnitsSuggestedAndSharedQAs.map(user => user.roleId)
    );

    return this;
  }

  async prepareAssessmentCompletedEmailToInnovators(
    recipients: RecipientType[],
    innovationName: string
  ): Promise<void> {
    for (const recipient of recipients) {
      // Prepare email for all innovators (owner + collaborators).
      this.emails.push({
        templateId: EmailTypeEnum.NEEDS_ASSESSMENT_COMPLETED_TO_INNOVATOR,
        to: recipient,
        notificationPreferenceType: null,
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          innovation_name: innovationName,
          needs_assessment_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('innovator/innovations/:innovationId/assessments/:assessmentId')
            .setPathParams({
              innovationId: this.inputData.innovationId,
              assessmentId: this.inputData.assessmentId
            })
            .buildUrl()
        }
      });
    }
  }

  async prepareAssessmentCompletedInAppToInnovators(userRoleIds: string[]): Promise<void> {
    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: {
        type: NotificationContextTypeEnum.NEEDS_ASSESSMENT,
        detail: NotificationContextDetailEnum.NEEDS_ASSESSMENT_COMPLETED_TO_INNOVATOR,
        id: this.inputData.assessmentId
      },
      userRoleIds: userRoleIds,
      params: {}
    });
  }

  async prepareOrganisationSuggestedNotSharedEmailToInnovators(
    recipients: RecipientType[],
    innovationName: string
  ): Promise<void> {
    for (const recipient of recipients) {
      // Prepare email for all innovators (owner + collaborators).
      this.emails.push({
        templateId: EmailTypeEnum.NEEDS_ASSESSMENT_SUGGESTED_ORG_NOT_SHARED_TO_INNOVATOR,
        to: recipient,
        notificationPreferenceType: null,
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          innovation_name: innovationName,
          data_sharing_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('innovator/innovations/:innovationId/support')
            .setPathParams({
              innovationId: this.inputData.innovationId
            })
            .buildUrl()
        }
      });
    }
  }

  async prepareOrganisationSuggestedNotSharedInAppToInnovators(userRoleIds: string[]): Promise<void> {
    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: {
        type: NotificationContextTypeEnum.NEEDS_ASSESSMENT,
        detail: NotificationContextDetailEnum.NEEDS_ASSESSMENT_ORGANISATION_SUGGESTION,
        id: this.inputData.assessmentId
      },
      userRoleIds: userRoleIds,
      params: {}
    });
  }

  async prepareSuggestedAndSharedOrganisationEmailToQAs(recipients: RecipientType[]): Promise<void> {
    for (const recipient of recipients) {
      this.emails.push({
        templateId: EmailTypeEnum.ORGANISATION_SUGGESTION_TO_QA,
        to: recipient,
        notificationPreferenceType: null,
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          innovation_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('accessor/innovations/:innovationId')
            .setPathParams({ innovationId: this.inputData.innovationId })
            .buildUrl()
        }
      });
    }
  }

  async prepareSuggestedAndSharedOrganisationInAppToQAs(userRoleIds: string[]): Promise<void> {
    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: {
        type: NotificationContextTypeEnum.NEEDS_ASSESSMENT,
        detail: NotificationContextDetailEnum.NEEDS_ASSESSMENT_COMPLETED,
        id: this.inputData.assessmentId
      },
      userRoleIds: userRoleIds,
      params: {}
    });
  }
}
