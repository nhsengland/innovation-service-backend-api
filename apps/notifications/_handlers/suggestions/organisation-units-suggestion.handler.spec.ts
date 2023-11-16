import { randText } from '@ngneat/falso';
import { ServiceRoleEnum } from '@notifications/shared/enums';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { testEmails, testInApps } from '../../_helpers/tests.helper';
import { dataSharingPreferencesUrl, innovationOverviewUrl } from '../../_helpers/url.helper';
import { RecipientsService } from '../../_services/recipients.service';
import { NotificationsTestsHelper } from '../../_tests/notifications-test.helper';
import { OrganisationUnitsSuggestionHandler } from './organisation-units-suggestion.handler';

describe('Notifications / _handlers / organisation-units-suggestion suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await testsHelper.init();
  });

  const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
  const comment = randText();

  const requestUser = scenario.users.aliceQualifyingAccessor;
  const requestUserUnit = requestUser.organisations.healthOrg.organisationUnits.healthOrgUnit;

  describe('OS01_UNITS_SUGGESTION_TO_SUGGESTED_UNITS_QA', () => {
    const healthOrgUnit = scenario.organisations.healthOrg.organisationUnits.healthOrgUnit;
    const healthOrgAiUnit = scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit;
    const unitQaRecipients = [
      DTOsHelper.getRecipientUser(scenario.users.sarahQualifyingAccessor, 'qaRole'),
      DTOsHelper.getRecipientUser(scenario.users.bartQualifyingAccessor, 'qaRole'),
      DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole')
    ];

    beforeEach(async () => {
      jest.spyOn(RecipientsService.prototype, 'getInnovationSupports').mockResolvedValue([
        {
          id: innovation.supports.supportByHealthOrgUnit.id,
          status: innovation.supports.supportByHealthOrgUnit.status,
          unitId: healthOrgUnit.id
        }
      ]);

      jest
        .spyOn(RecipientsService.prototype, 'organisationUnitsQualifyingAccessors')
        .mockResolvedValue(unitQaRecipients);
    });

    it('should send an email to the QAs from the units that were suggested', async () => {
      await testEmails(OrganisationUnitsSuggestionHandler, 'OS01_UNITS_SUGGESTION_TO_SUGGESTED_UNITS_QA', {
        notificationPreferenceType: 'ORGANISATION_SUGGESTIONS',
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        inputData: {
          innovationId: innovation.id,
          unitsIds: [healthOrgUnit.id, healthOrgAiUnit.id],
          comment: comment
        },
        recipients: unitQaRecipients,
        outputData: unitQaRecipients.map(r => ({
          innovation_name: innovation.name,
          organisation_unit: requestUserUnit.name,
          comment: comment,
          innovation_overview_url: innovationOverviewUrl(ServiceRoleEnum.ACCESSOR, innovation.id),
          showKPI: (r.unitId === healthOrgAiUnit.id ? 'yes' : 'yes') as any // TODO: If KPIs are optional for some this can be changed
        }))
      });
    });

    it('should send an in-app to the QAs from the units that were suggested', async () => {
      await testInApps(OrganisationUnitsSuggestionHandler, 'OS01_UNITS_SUGGESTION_TO_SUGGESTED_UNITS_QA', {
        innovationId: innovation.id,
        context: { type: 'ORGANISATION_SUGGESTIONS', id: innovation.id },
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        inputData: {
          innovationId: innovation.id,
          unitsIds: [healthOrgUnit.id, healthOrgAiUnit.id],
          comment: comment
        },
        recipients: unitQaRecipients,
        outputData: {
          innovationName: innovation.name,
          senderDisplayInformation: requestUserUnit.name
        }
      });
    });
  });

  describe('OS02_UNITS_SUGGESTION_NOT_SHARED_TO_INNOVATOR', () => {
    const innovatorRecipients = [
      DTOsHelper.getRecipientUser(scenario.users.johnInnovator),
      DTOsHelper.getRecipientUser(scenario.users.janeInnovator)
    ];

    it('should send an email to the innovators when innovation is not shared with suggested unit', async () => {
      await testEmails(OrganisationUnitsSuggestionHandler, 'OS02_UNITS_SUGGESTION_NOT_SHARED_TO_INNOVATOR', {
        notificationPreferenceType: 'ORGANISATION_SUGGESTIONS',
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        inputData: {
          innovationId: innovation.id,
          unitsIds: [scenario.organisations.innovTechOrg.organisationUnits.innovTechHeavyOrgUnit.id],
          comment: comment
        },
        recipients: innovatorRecipients,
        outputData: {
          innovation_name: innovation.name,
          data_sharing_preferences_url: dataSharingPreferencesUrl(ServiceRoleEnum.INNOVATOR, innovation.id)
        }
      });
    });

    it('should send an in-app to the innovators when innovation is not shared with suggested unit', async () => {
      await testInApps(OrganisationUnitsSuggestionHandler, 'OS02_UNITS_SUGGESTION_NOT_SHARED_TO_INNOVATOR', {
        innovationId: innovation.id,
        context: { type: 'ORGANISATION_SUGGESTIONS', id: innovation.id },
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        inputData: {
          innovationId: innovation.id,
          unitsIds: [scenario.organisations.innovTechOrg.organisationUnits.innovTechHeavyOrgUnit.id],
          comment: comment
        },
        recipients: innovatorRecipients,
        outputData: {}
      });
    });
  });
});
