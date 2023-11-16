import { ServiceRoleEnum } from '@notifications/shared/enums';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { testEmails, testInApps } from '../../../_helpers/tests.helper';
import { createAccountUrl, dashboardUrl } from '../../../_helpers/url.helper';
import { RecipientsService } from '../../../_services/recipients.service';
import { NotificationsTestsHelper } from '../../../_tests/notifications-test.helper';
import { InnovationTransferOwnershipCreationHandler } from './innovation-transfer-ownership-creation.handler';

describe('Notifications / _handlers / innovation-transfer-ownership-creation handler suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  const innovation = scenario.users.adamInnovator.innovations.adamInnovation;
  const innovationOwner = scenario.users.adamInnovator;

  beforeAll(async () => {
    await testsHelper.init();
  });

  // Mocks
  const transferMock = jest.spyOn(RecipientsService.prototype, 'innovationTransferInfoWithOwner');

  describe('TO01_TRANSFER_OWNERSHIP_NEW_USER', () => {
    it('should send email to new user', async () => {
      transferMock.mockResolvedValueOnce({
        id: innovation.transfer.id,
        email: 'newUser@example.org',
        status: innovation.transfer.status,
        ownerId: innovationOwner.id
      });
      await testEmails(InnovationTransferOwnershipCreationHandler, 'TO01_TRANSFER_OWNERSHIP_NEW_USER', {
        notificationPreferenceType: 'INNOVATION_MANAGEMENT',
        inputData: {
          innovationId: innovation.id,
          transferId: innovation.transfer.id
        },
        outputData: {
          create_account_url: createAccountUrl(),
          innovation_name: innovation.name,
          innovator_name: innovationOwner.name
        },
        recipients: [{ email: 'newUser@example.org' }],
        requestUser: DTOsHelper.getUserRequestContext(innovationOwner)
      });
    });
  });

  describe('TO02_TRANSFER_OWNERSHIP_EXISTING_USER', () => {
    it('should send email to existing user', async () => {
      await testEmails(InnovationTransferOwnershipCreationHandler, 'TO02_TRANSFER_OWNERSHIP_EXISTING_USER', {
        notificationPreferenceType: 'INNOVATION_MANAGEMENT',
        inputData: {
          innovationId: innovation.id,
          transferId: innovation.transfer.id
        },
        outputData: {
          dashboard_url: dashboardUrl(ServiceRoleEnum.INNOVATOR),
          innovation_name: innovation.name,
          innovator_name: innovationOwner.name
        },
        recipients: [DTOsHelper.getRecipientUser(scenario.users.janeInnovator)],
        requestUser: DTOsHelper.getUserRequestContext(innovationOwner)
      });
    });

    it('should send inapp to existing user', async () => {
      await testInApps(InnovationTransferOwnershipCreationHandler, 'TO02_TRANSFER_OWNERSHIP_EXISTING_USER', {
        context: {
          id: innovation.id,
          type: 'INNOVATION_MANAGEMENT'
        },
        innovationId: innovation.id,
        inputData: {
          innovationId: innovation.id,
          transferId: innovation.transfer.id
        },
        outputData: {
          innovationName: innovation.name,
          transferId: innovation.transfer.id
        },
        recipients: [DTOsHelper.getRecipientUser(scenario.users.janeInnovator)],
        requestUser: DTOsHelper.getUserRequestContext(innovationOwner)
      });
    });
  });
});
