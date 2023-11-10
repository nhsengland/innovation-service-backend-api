import { randFutureDate } from '@ngneat/falso';
import { NotificationCategoryEnum, ServiceRoleEnum } from '@notifications/shared/enums';
import { MocksHelper } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { testEmails, testInApps } from '../../../_helpers/tests.helper';
import { innovationOverviewUrl } from '../../../_helpers/url.helper';
import { NotificationsTestsHelper } from '../../../_tests/notifications-test.helper';
import { AccountDeletionHandler } from './account-deletion.handler';

describe('Notifications / _handlers / account-deletion suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await testsHelper.init();
  });

  const requestUser = scenario.users.johnInnovator;
  const transferExpireDate = randFutureDate().toISOString();

  describe('DA01_OWNER_DELETED_ACCOUNT_WITH_PENDING_TRANSFER_TO_COLLABORATOR', () => {
    const innovation = requestUser.innovations.johnInnovation;

    describe('when the innovations has collaborators', () => {
      it('should send an email to the collaborators', async () => {
        await testEmails(AccountDeletionHandler, 'DA01_OWNER_DELETED_ACCOUNT_WITH_PENDING_TRANSFER_TO_COLLABORATOR', {
          notificationPreferenceType: null,
          requestUser: DTOsHelper.getUserRequestContext(requestUser),
          recipients: [DTOsHelper.getRecipientUser(scenario.users.janeInnovator)],
          inputData: {
            innovations: [{ id: innovation.id, name: innovation.name, transferExpireDate: transferExpireDate }]
          },
          outputData: {
            expiry_date: transferExpireDate,
            innovation_name: innovation.name,
            innovation_overview_url: innovationOverviewUrl(ServiceRoleEnum.INNOVATOR, innovation.id)
          }
        });
      });

      it('should send an in-app to assigned users', async () => {
        await testInApps(AccountDeletionHandler, 'DA01_OWNER_DELETED_ACCOUNT_WITH_PENDING_TRANSFER_TO_COLLABORATOR', {
          context: { type: NotificationCategoryEnum.INNOVATION_MANAGEMENT, id: requestUser.id },
          innovationId: innovation.id,
          requestUser: DTOsHelper.getUserRequestContext(requestUser),
          recipients: [DTOsHelper.getRecipientUser(scenario.users.janeInnovator)],
          inputData: {
            innovations: [{ id: innovation.id, name: innovation.name, transferExpireDate: transferExpireDate }]
          },
          outputData: { innovationName: innovation.name }
        });
      });
    });

    describe('when the innovations has no collaborators', () => {
      const innovation = requestUser.innovations.johnInnovationEmpty;

      it('should not send an email or in-app', async () => {
        const handler = new AccountDeletionHandler(
          DTOsHelper.getUserRequestContext(requestUser),
          {
            innovations: [{ id: innovation.id, name: innovation.name, transferExpireDate: transferExpireDate }]
          },
          MocksHelper.mockContext()
        );

        await handler.run();
        expect(handler.inApp).toHaveLength(0);
        expect(handler.emails).toHaveLength(0);
      });
    });
  });
});
