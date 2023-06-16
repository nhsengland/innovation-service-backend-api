import { InnovationOrganisationUnitsSuggestionHandler } from './innovation-organisation-units-suggestion.handler';

import { CompleteScenarioType, MocksHelper, TestsHelper } from '@notifications/shared/tests';
import { RecipientsService } from '../_services/recipients.service';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { ENV, EmailTypeEnum } from '../_config';
import { UrlModel } from '@notifications/shared/models';

describe('Notifications / _handlers / innovation-organisation-units-suggestion handler suite', () => {
  let testsHelper: TestsHelper;
  let scenario: CompleteScenarioType;

  let innovation: CompleteScenarioType['users']['johnInnovator']['innovations']['johnInnovation'];

  let handler: InnovationOrganisationUnitsSuggestionHandler;

  beforeAll(async () => {
    testsHelper = await new TestsHelper().init();
    scenario = testsHelper.getCompleteScenario();

    innovation = scenario.users.johnInnovator.innovations.johnInnovation;
  });

  beforeEach(async () => {
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
          },
          {
            id: scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id,
            name: scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.name,
            acronym: scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.acronym
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
        DTOsHelper.getRecipientUser(scenario.users.sarahQualifyingAccessor)
      ]);

    handler = new InnovationOrganisationUnitsSuggestionHandler(
      DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
      {
        innovationId: innovation.id,
        organisationUnitIds: [
          scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id,
          scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
          scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.id
        ]
      },
      MocksHelper.mockContext()
    );

    await handler.run();
  });

  it('Should send email to all QAs of suggested organisation units that innovation shares with', () => {
    expect(handler.emails).toHaveLength(2);
    expect(handler.emails).toMatchObject([
      {
        templateId: EmailTypeEnum.ORGANISATION_SUGGESTION_TO_QA,
        to: DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor),
        notificationPreferenceType: null,
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          innovation_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('accessor/innovations/:innovationId')
            .setPathParams({ innovationId: innovation.id })
            .buildUrl()
        }
      },
      {
        templateId: EmailTypeEnum.ORGANISATION_SUGGESTION_TO_QA,
        to: DTOsHelper.getRecipientUser(scenario.users.sarahQualifyingAccessor),
        notificationPreferenceType: null,
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          innovation_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('accessor/innovations/:innovationId')
            .setPathParams({ innovationId: innovation.id })
            .buildUrl()
        }
      }
    ]);
  });
});
