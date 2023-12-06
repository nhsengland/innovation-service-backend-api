import { ServiceRoleEnum } from '@notifications/shared/enums';
import { IdentityProviderService } from '@notifications/shared/services';
import { SYSTEM_CRON_SENDER } from '@notifications/shared/services/integrations/notifier.service';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { testEmails, testInApps } from '../../_helpers/tests.helper';
import { createAccountUrl, dashboardUrl } from '../../_helpers/url.helper';
import { NotificationsTestsHelper } from '../../_tests/notifications-test.helper';
import { InnovationTransferOwnershipReminderHandler } from './innovation-transfer-ownership-reminder.handler';

describe('Notifications / _handlers / innovation-transfer-ownership-reminder handler suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  const innovation = scenario.users.adamInnovator.innovations.adamInnovation;

  beforeAll(async () => {
    await testsHelper.init();
  });

  describe('AU08_TRANSFER_ONE_WEEK_REMINDER_EXISTING_USER', () => {
    it('Should send email to target user that already exists in the service', async () => {
      await testEmails(InnovationTransferOwnershipReminderHandler, 'AU08_TRANSFER_ONE_WEEK_REMINDER_EXISTING_USER', {
        inputData: {
          innovationId: innovation.id,
          innovationName: innovation.name,
          recipientEmail: scenario.users.janeInnovator.email
        },
        notificationPreferenceType: 'AUTOMATIC',
        outputData: {
          dashboard_url: dashboardUrl(ServiceRoleEnum.INNOVATOR),
          innovation_name: innovation.name
        },
        recipients: [DTOsHelper.getRecipientUser(scenario.users.janeInnovator)],
        requestUser: SYSTEM_CRON_SENDER
      });
    });

    it('Should send inapp to target user that already exists in the service', async () => {
      await testInApps(InnovationTransferOwnershipReminderHandler, 'AU08_TRANSFER_ONE_WEEK_REMINDER_EXISTING_USER', {
        context: {
          id: innovation.id,
          type: 'AUTOMATIC'
        },
        innovationId: innovation.id,
        inputData: {
          innovationId: innovation.id,
          innovationName: innovation.name,
          recipientEmail: scenario.users.janeInnovator.email
        },
        outputData: {
          innovationName: innovation.name
        },
        recipients: [DTOsHelper.getRecipientUser(scenario.users.janeInnovator)],
        requestUser: SYSTEM_CRON_SENDER
      });
    });
  });

  describe('AU07_TRANSFER_ONE_WEEK_REMINDER_NEW_USER', () => {
    it('Should send email to target user outside the service', async () => {
      jest.spyOn(IdentityProviderService.prototype, 'getUserInfoByEmail').mockResolvedValueOnce(null);
      await testEmails(InnovationTransferOwnershipReminderHandler, 'AU07_TRANSFER_ONE_WEEK_REMINDER_NEW_USER', {
        inputData: {
          innovationId: innovation.id,
          innovationName: innovation.name,
          recipientEmail: scenario.users.janeInnovator.email
        },
        notificationPreferenceType: 'AUTOMATIC',
        outputData: {
          create_account_url: createAccountUrl(),
          innovation_name: innovation.name
        },
        recipients: [{ email: scenario.users.janeInnovator.email }],
        requestUser: SYSTEM_CRON_SENDER
      });
    });
  });
});
