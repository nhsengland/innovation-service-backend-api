import * as crypto from 'crypto';
import { ServiceRoleEnum } from '@notifications/shared/enums';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { testEmails, testInApps } from '../../_helpers/tests.helper';
import { innovationOverviewUrl } from '../../_helpers/url.helper';
import { RecipientsService } from '../../_services/recipients.service';
import { NotificationsTestsHelper } from '../../_tests/notifications-test.helper';
import { InnovationDelayedSharedSuggestionHandler } from './innovation-delayed-shared-suggestion.handler';

jest.mock('crypto');
const notificationId = '00001234-1234-1234-1234-123456789012';
jest.spyOn(crypto, 'randomUUID').mockImplementation(() => notificationId);

describe('Notifications / _handlers / innovation-delayed-shared-suggestion suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
  const requestUser = scenario.users.aliceQualifyingAccessor;
  const healthOrg = scenario.organisations.healthOrg;

  beforeAll(async () => {
    await testsHelper.init();

    jest
      .spyOn(RecipientsService.prototype, 'getUnitSuggestionsByInnovation')
      .mockResolvedValue([{ orgId: healthOrg.id, unitId: healthOrg.organisationUnits.healthOrgUnit.id }]);
  });

  describe('OS03_INNOVATION_DELAYED_SHARED_SUGGESTION', () => {
    it('should send an email to the QAs from the units that were suggested and delayed shared', async () => {
      await testEmails(InnovationDelayedSharedSuggestionHandler, 'OS03_INNOVATION_DELAYED_SHARED_SUGGESTION', {
        notificationPreferenceType: 'ORGANISATION_SUGGESTIONS',
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        inputData: { innovationId: innovation.id, newSharedOrgIds: [scenario.organisations.healthOrg.id] },
        recipients: [DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor)],
        outputData: {
          innovation_name: innovation.name,
          innovation_overview_url: innovationOverviewUrl(ServiceRoleEnum.ACCESSOR, innovation.id, notificationId)
        }
      });
    });

    it('should send an in-app to the QAs from the units that were suggested and delayed shared', async () => {
      await testInApps(InnovationDelayedSharedSuggestionHandler, 'OS03_INNOVATION_DELAYED_SHARED_SUGGESTION', {
        innovationId: innovation.id,
        context: { type: 'ORGANISATION_SUGGESTIONS', id: innovation.id },
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        inputData: { innovationId: innovation.id, newSharedOrgIds: [scenario.organisations.healthOrg.id] },
        recipients: [DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor)],
        outputData: { innovationName: innovation.name },
        notificationId
      });
    });
  });
});
