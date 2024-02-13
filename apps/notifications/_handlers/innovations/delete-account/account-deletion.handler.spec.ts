import { randFutureDate } from '@ngneat/falso';
import { ServiceRoleEnum } from '@notifications/shared/enums';
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
            innovations: {
              withPendingTransfer: [
                { id: innovation.id, name: innovation.name, transferExpireDate: transferExpireDate }
              ],
              withoutPendingTransfer: []
            }
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
          context: { type: 'INNOVATION_MANAGEMENT', id: requestUser.id },
          innovationId: innovation.id,
          requestUser: DTOsHelper.getUserRequestContext(requestUser),
          recipients: [DTOsHelper.getRecipientUser(scenario.users.janeInnovator)],
          inputData: {
            innovations: {
              withPendingTransfer: [
                { id: innovation.id, name: innovation.name, transferExpireDate: transferExpireDate }
              ],
              withoutPendingTransfer: []
            }
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
            innovations: {
              withPendingTransfer: [
                { id: innovation.id, name: innovation.name, transferExpireDate: transferExpireDate }
              ],
              withoutPendingTransfer: []
            }
          },
          MocksHelper.mockContext()
        );

        await handler.run();
        expect(handler.inApp).toHaveLength(0);
        expect(handler.emails).toHaveLength(0);
      });
    });
  });

  describe('DA02_OWNER_DELETED_ACCOUNT_WITHOUT_PENDING_TRANSFER_TO_COLLABORATOR', () => {
    const innovation = requestUser.innovations.johnInnovation;

    describe('when the innovations has collaborators', () => {
      it('should send an email to the collaborators', async () => {
        await testEmails(
          AccountDeletionHandler,
          'DA02_OWNER_DELETED_ACCOUNT_WITHOUT_PENDING_TRANSFER_TO_COLLABORATOR',
          {
            notificationPreferenceType: null,
            requestUser: DTOsHelper.getUserRequestContext(requestUser),
            recipients: [DTOsHelper.getRecipientUser(scenario.users.janeInnovator)],
            inputData: {
              innovations: {
                withPendingTransfer: [],
                withoutPendingTransfer: [{ id: innovation.id, name: innovation.name }]
              }
            },
            outputData: {
              innovation_name: innovation.name
            }
          }
        );
      });

      it('should send an in-app to assigned users', async () => {
        await testInApps(
          AccountDeletionHandler,
          'DA02_OWNER_DELETED_ACCOUNT_WITHOUT_PENDING_TRANSFER_TO_COLLABORATOR',
          {
            context: { type: 'INNOVATION_MANAGEMENT', id: requestUser.id },
            innovationId: innovation.id,
            requestUser: DTOsHelper.getUserRequestContext(requestUser),
            recipients: [DTOsHelper.getRecipientUser(scenario.users.janeInnovator)],
            inputData: {
              innovations: {
                withPendingTransfer: [],
                withoutPendingTransfer: [{ id: innovation.id, name: innovation.name }]
              }
            },
            outputData: { innovationName: innovation.name }
          }
        );
      });
    });

    describe('when the innovations has no collaborators', () => {
      const innovation = requestUser.innovations.johnInnovationEmpty;

      it('should not send an email or in-app', async () => {
        const handler = new AccountDeletionHandler(
          DTOsHelper.getUserRequestContext(requestUser),
          {
            innovations: {
              withPendingTransfer: [
                { id: innovation.id, name: innovation.name, transferExpireDate: transferExpireDate }
              ],
              withoutPendingTransfer: []
            }
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
