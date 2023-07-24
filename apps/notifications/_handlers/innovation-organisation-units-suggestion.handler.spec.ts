import { InnovationOrganisationUnitsSuggestionHandler } from './innovation-organisation-units-suggestion.handler';

import { MocksHelper, TestsHelper } from '@notifications/shared/tests';
import { RecipientsService } from '../_services/recipients.service';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { ENV, EmailTypeEnum } from '../_config';
import { UrlModel } from '@notifications/shared/models';
import { NotificationContextDetailEnum, NotificationContextTypeEnum } from '@notifications/shared/enums';

describe('Notifications / _handlers / innovation-organisation-units-suggestion handler suite', () => {
  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  let handler: InnovationOrganisationUnitsSuggestionHandler;

  const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

  beforeAll(async () => {
    await testsHelper.init();
  });

  beforeAll(async () => {
    jest.spyOn(RecipientsService.prototype, 'innovationSharedOrganisationsWithUnits').mockResolvedValueOnce([
      {
        id: scenario.organisations.healthOrg.id,
        name: scenario.organisations.healthOrg.name,
        acronym: scenario.organisations.healthOrg.acronym,

        organisationUnits: [
          {
            id: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
            name: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
            acronym: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.acronym
          }
        ]
      },
      {
        id: scenario.organisations.medTechOrg.id,
        name: scenario.organisations.medTechOrg.name,
        acronym: scenario.organisations.medTechOrg.acronym,

        organisationUnits: [
          {
            id: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.id,
            name: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.name,
            acronym: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.acronym
          }
        ]
      }
    ]);
    jest
      .spyOn(RecipientsService.prototype, 'organisationUnitsQualifyingAccessors')
      .mockResolvedValueOnce([
        DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor),
        DTOsHelper.getRecipientUser(scenario.users.scottQualifyingAccessor)
      ]);

    jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
      name: innovation.name,
      ownerId: scenario.users.johnInnovator.id,
      ownerIdentityId: scenario.users.johnInnovator.identityId
    });

    jest
      .spyOn(RecipientsService.prototype, 'getUsersRecipient')
      .mockResolvedValueOnce(DTOsHelper.getRecipientUser(scenario.users.johnInnovator)) // innovation owner
      .mockResolvedValueOnce([DTOsHelper.getRecipientUser(scenario.users.janeInnovator)]); // innovation collaborators

    jest
      .spyOn(RecipientsService.prototype, 'getInnovationActiveCollaborators')
      .mockResolvedValueOnce([scenario.users.janeInnovator.id]);

    handler = new InnovationOrganisationUnitsSuggestionHandler(
      DTOsHelper.getUserRequestContext(scenario.users.sarahQualifyingAccessor),
      {
        innovationId: innovation.id,
        organisationUnitIds: [
          scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id, // not shared
          scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
          scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.id
        ]
      },
      MocksHelper.mockContext()
    );

    await handler.run();
  });

  it('Should send email to all QAs of suggested organisation units that innovation shares with', () => {
    const expectedEmails = handler.emails.filter(
      email => email.templateId === EmailTypeEnum.ORGANISATION_SUGGESTION_TO_QA
    );
    expect(expectedEmails).toMatchObject([
      {
        templateId: EmailTypeEnum.ORGANISATION_SUGGESTION_TO_QA,
        to: DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor),
        notificationPreferenceType: null,
        params: {
          innovation_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('accessor/innovations/:innovationId')
            .setPathParams({ innovationId: innovation.id })
            .buildUrl()
        }
      },
      {
        templateId: EmailTypeEnum.ORGANISATION_SUGGESTION_TO_QA,
        to: DTOsHelper.getRecipientUser(scenario.users.scottQualifyingAccessor),
        notificationPreferenceType: null,
        params: {
          innovation_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('accessor/innovations/:innovationId')
            .setPathParams({ innovationId: innovation.id })
            .buildUrl()
        }
      }
    ]);
  });

  it('Should send email to innovation owner and collaborators when there are suggested organisation units that innovation is not shared with', () => {
    const expectedEmails = handler.emails.filter(
      email => email.templateId === EmailTypeEnum.ORGANISATION_SUGGESTION_NOT_SHARED_TO_INNOVATOR
    );
    expect(expectedEmails).toMatchObject([
      {
        templateId: EmailTypeEnum.ORGANISATION_SUGGESTION_NOT_SHARED_TO_INNOVATOR,
        to: DTOsHelper.getRecipientUser(scenario.users.johnInnovator),
        notificationPreferenceType: null,
        params: {
          innovation_name: innovation.name,
          data_sharing_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('innovator/innovations/:innovationId/support')
            .setPathParams({ innovationId: innovation.id })
            .buildUrl()
        }
      },
      {
        templateId: EmailTypeEnum.ORGANISATION_SUGGESTION_NOT_SHARED_TO_INNOVATOR,
        to: DTOsHelper.getRecipientUser(scenario.users.janeInnovator),
        notificationPreferenceType: null,
        params: {
          innovation_name: innovation.name,
          data_sharing_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('innovator/innovations/:innovationId/support')
            .setPathParams({ innovationId: innovation.id })
            .buildUrl()
        }
      }
    ]);
  });

  it('Should send inApp to innovation owner and collaborators when there are suggested organisation units that innovation is not shared with', () => {
    const expectedInApps = handler.inApp.filter(
      inApp => inApp.context.detail === NotificationContextDetailEnum.INNOVATION_ORGANISATION_SUGGESTION_NOT_SHARED
    );
    expect(expectedInApps).toMatchObject([
      {
        innovationId: innovation.id,
        context: {
          type: NotificationContextTypeEnum.DATA_SHARING,
          detail: NotificationContextDetailEnum.INNOVATION_ORGANISATION_SUGGESTION_NOT_SHARED,
          id: innovation.id
        },
        userRoleIds: [scenario.users.johnInnovator.roles.innovatorRole.id],
        params: {}
      },
      {
        innovationId: innovation.id,
        context: {
          type: NotificationContextTypeEnum.DATA_SHARING,
          detail: NotificationContextDetailEnum.INNOVATION_ORGANISATION_SUGGESTION_NOT_SHARED,
          id: innovation.id
        },
        userRoleIds: [scenario.users.janeInnovator.roles.innovatorRole.id],
        params: {}
      }
    ]);
  });
});
