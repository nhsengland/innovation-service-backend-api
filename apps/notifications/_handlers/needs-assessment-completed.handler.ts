import { NotificationContextDetailEnum, NotificationContextTypeEnum, NotifierTypeEnum, ServiceRoleEnum } from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { container, EmailTypeEnum, ENV } from '../_config';
import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';

import { BaseHandler } from './base.handler';


export class NeedsAssessmentCompletedHandler extends BaseHandler<
  NotifierTypeEnum.NEEDS_ASSESSMENT_COMPLETED,
  EmailTypeEnum.NEEDS_ASSESSMENT_COMPLETED_TO_INNOVATOR | EmailTypeEnum.ORGANISATION_SUGGESTION_TO_QA,
  Record<string, never>
> {

  private recipientsService = container.get<RecipientsServiceType>(RecipientsServiceSymbol);

  constructor(
    requestUser: { id: string, identityId: string },
    data: NotifierTemplatesType[NotifierTypeEnum.NEEDS_ASSESSMENT_COMPLETED],
    domainContext: DomainContextType,
  ) {
    super(requestUser, data, domainContext);
  }


  async run(): Promise<this> {

    const innovation = await this.recipientsService.innovationInfoWithOwner(this.inputData.innovationId);
    const sharedOrganisations = await this.recipientsService.innovationSharedOrganisationsWithUnits(this.inputData.innovationId);

    if (innovation.owner.isActive) {
      // Prepare email for innovator.
      this.emails.push({
        templateId: EmailTypeEnum.NEEDS_ASSESSMENT_COMPLETED_TO_INNOVATOR,
        to: { type: 'identityId', value: innovation.owner.identityId, displayNameParam: 'display_name' },
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          innovation_name: innovation.name,
          needs_assessment_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('innovator/innovations/:innovationId/assessments/:assessmentId')
            .setPathParams({ innovationId: this.inputData.innovationId, assessmentId: this.inputData.assessmentId })
            .buildUrl()
        }
      });
    }
    
    // Prepare InApp for innovator.
    // Send only if there's suggested organisation units from organisations NOT shared with the innovation.
    const sharedOrganisationUnitsIds = sharedOrganisations.flatMap(organisation => organisation.organisationUnits.map(unit => unit.id));
    const organisationUnitsSuggestedNotSharedIds = this.inputData.organisationUnitIds.filter(item => !sharedOrganisationUnitsIds.includes(item));
    if (organisationUnitsSuggestedNotSharedIds.length > 0) {
      this.inApp.push({
        innovationId: this.inputData.innovationId,
        context: { type: NotificationContextTypeEnum.NEEDS_ASSESSMENT, detail: NotificationContextDetailEnum.NEEDS_ASSESSMENT_ORGANISATION_SUGGESTION, id: this.inputData.assessmentId },
        users: [{ userId: innovation.owner.id, roleId: innovation.owner.userRole.id }],
        params: {}
      });
    }


    // Prepare emails and InApp for Qualifying accessors.
    const organisationUnitsSuggestedAndSharedIds = this.inputData.organisationUnitIds.filter(item => sharedOrganisationUnitsIds.includes(item));
    const organisationUnitsSuggestedAndSharedQAs = await this.recipientsService.organisationUnitsQualifyingAccessors(organisationUnitsSuggestedAndSharedIds);
    
    // TODO: Duplicated emails without reference to unit Id. Filtering unique for now, maybe use unit in the future
    const emailUsersIdentityIds = [...new Set(organisationUnitsSuggestedAndSharedQAs.map(item => item.identityId))];
    for (const identityId of emailUsersIdentityIds) {
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

    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: { type: NotificationContextTypeEnum.NEEDS_ASSESSMENT, detail: NotificationContextDetailEnum.NEEDS_ASSESSMENT_COMPLETED, id: this.inputData.assessmentId },
      users: organisationUnitsSuggestedAndSharedQAs.map(user => ({ userId: user.id, roleId: user.roleId, userType: ServiceRoleEnum.QUALIFYING_ACCESSOR, organisationUnitId: user.organisationUnitId })),
      params: {}
    });
    
    return this;

  }

}
