import {
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
  NotifierTypeEnum
} from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { container, EmailTypeEnum, ENV } from '../_config';
import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';

import { BaseHandler } from './base.handler';

export class NeedsAssessmentCompletedHandler extends BaseHandler<
  NotifierTypeEnum.NEEDS_ASSESSMENT_COMPLETED,
  | EmailTypeEnum.NEEDS_ASSESSMENT_COMPLETED_TO_INNOVATOR
  | EmailTypeEnum.ORGANISATION_SUGGESTION_TO_QA
  | EmailTypeEnum.NEEDS_ASSESSMENT_SUGGESTED_ORG_NOT_SHARED_TO_INNOVATOR,
  Record<string, never>
> {
  private recipientsService = container.get<RecipientsServiceType>(RecipientsServiceSymbol);

  constructor(
    requestUser: { id: string; identityId: string },
    data: NotifierTemplatesType[NotifierTypeEnum.NEEDS_ASSESSMENT_COMPLETED],
    domainContext: DomainContextType
  ) {
    super(requestUser, data, domainContext);
  }

  async run(): Promise<this> {
    const innovation = await this.recipientsService.innovationInfoWithOwner(this.inputData.innovationId);
    const sharedOrganisations = await this.recipientsService.innovationSharedOrganisationsWithUnits(
      this.inputData.innovationId
    );

    const innovatorRecipients = (
      await this.recipientsService.innovationActiveCollaboratorUsers(this.inputData.innovationId)
    ).filter(c => c.isActive);

    if (innovation.owner.isActive) {
      innovatorRecipients.push(innovation.owner);
    }

    // Assessment completed notifications for innovators (owner + collaborators)
    await this.prepareAssessmentCompletedEmailToInnovators(
      innovatorRecipients.map(i => i.identityId),
      innovation.name
    );
    await this.prepareAssessmentCompletedInAppToInnovators(innovatorRecipients.map(i => i.userRole.id));

    // Notifications for innovators (owner + collaborators) when there are suggested orgs not shared with
    const sharedOrganisationUnitsIds = sharedOrganisations.flatMap(organisation =>
      organisation.organisationUnits.map(unit => unit.id)
    );
    const organisationUnitsSuggestedNotSharedIds = this.inputData.organisationUnitIds.filter(
      item => !sharedOrganisationUnitsIds.includes(item)
    );
    if (organisationUnitsSuggestedNotSharedIds.length > 0) {
      await this.prepareOrganisationSuggestedNotSharedEmailToInnovators(
        innovatorRecipients.map(i => i.identityId),
        innovation.name
      );
      await this.prepareOrganisationSuggestedNotSharedInAppToInnovators(innovatorRecipients.map(i => i.userRole.id));
    }

    // Notifications for Qualifying Accessors
    const organisationUnitsSuggestedAndSharedIds = this.inputData.organisationUnitIds.filter(item =>
      sharedOrganisationUnitsIds.includes(item)
    );
    const organisationUnitsSuggestedAndSharedQAs = await this.recipientsService.organisationUnitsQualifyingAccessors(
      organisationUnitsSuggestedAndSharedIds
    );

    // TODO: Duplicated emails without reference to unit Id. Filtering unique for now, maybe use unit in the future
    const emailRecipientQAIdentityIds = [
      ...new Set(organisationUnitsSuggestedAndSharedQAs.map(item => item.identityId))
    ];

    await this.prepareSuggestedAndSharedOrganisationEmailToQAs(emailRecipientQAIdentityIds);
    await this.prepareSuggestedAndSharedOrganidationInAppToQAs(
      organisationUnitsSuggestedAndSharedQAs.map(user => user.roleId)
    );

    return this;
  }

  async prepareAssessmentCompletedEmailToInnovators(identityIds: string[], innovationName: string): Promise<void> {
    for (const identityId of identityIds) {
      // Prepare email for all innovators (owner + collaborators).
      this.emails.push({
        templateId: EmailTypeEnum.NEEDS_ASSESSMENT_COMPLETED_TO_INNOVATOR,
        to: {
          type: 'identityId',
          value: identityId,
          displayNameParam: 'display_name'
        },
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

  async prepareAssessmentCompletedInAppToInnovators(userRoleIds: string[]) {
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

  async prepareOrganisationSuggestedNotSharedEmailToInnovators(identityIds: string[], innovationName: string) {
    for (const identityId of identityIds) {
      // Prepare email for all innovators (owner + collaborators).
      this.emails.push({
        templateId: EmailTypeEnum.NEEDS_ASSESSMENT_SUGGESTED_ORG_NOT_SHARED_TO_INNOVATOR,
        to: {
          type: 'identityId',
          value: identityId,
          displayNameParam: 'display_name'
        },
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

  async prepareOrganisationSuggestedNotSharedInAppToInnovators(userRoleIds: string[]) {
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

  async prepareSuggestedAndSharedOrganisationEmailToQAs(identityIds: string[]) {
    for (const identityId of identityIds) {
      this.emails.push({
        templateId: EmailTypeEnum.ORGANISATION_SUGGESTION_TO_QA,
        to: { type: 'identityId', value: identityId, displayNameParam: 'display_name' },
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

  async prepareSuggestedAndSharedOrganidationInAppToQAs(userRoleIds: string[]) {
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
