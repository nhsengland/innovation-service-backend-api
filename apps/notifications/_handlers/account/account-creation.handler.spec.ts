import { randUserName, randUuid } from '@ngneat/falso';
import { InnovationExportRequestStatusEnum, ServiceRoleEnum } from '@notifications/shared/enums';
import { MocksHelper } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { HandlersHelper } from '../../_helpers/handlers.helper';
import { testEmails } from '../../_helpers/tests.helper';
import { dashboardUrl } from '../../_helpers/url.helper';
import { RecipientsService } from '../../_services/recipients.service';
import { NotificationsTestsHelper } from '../../_tests/notifications-test.helper';
import { AccountCreationHandler } from './account-creation.handler';

describe('Notifications / _handlers / account-creation suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await testsHelper.init();
  });

  describe('CA01_ACCOUNT_CREATION_OF_INNOVATOR', () => {
    it('should send an email to user who created a new innovator account', async () => {
      await testEmails(AccountCreationHandler, 'CA01_ACCOUNT_CREATION_OF_INNOVATOR', {
        notificationPreferenceType: 'ACCOUNT',
        requestUser: DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        recipients: [DTOsHelper.getRecipientUser(scenario.users.johnInnovator)],
        inputData: {},
        outputData: { dashboard_url: dashboardUrl(ServiceRoleEnum.INNOVATOR) },
        options: { includeSelf: true }
      });
    });
  });

  describe('CA02_ACCOUNT_CREATION_OF_COLLABORATOR', () => {
    const collaboratorAccount = scenario.users.janeInnovator;
    it('should send an email to the user who was invited to collaborate in just one innovation', async () => {
      const innovationName = randUserName();
      jest.spyOn(RecipientsService.prototype, 'getUserCollaborations').mockResolvedValue([
        {
          collaborationId: randUuid(),
          status: InnovationExportRequestStatusEnum.PENDING,
          innovationId: randUuid(),
          innovationName: innovationName
        }
      ]);

      await testEmails(AccountCreationHandler, 'CA02_ACCOUNT_CREATION_OF_COLLABORATOR', {
        notificationPreferenceType: 'ACCOUNT',
        requestUser: DTOsHelper.getUserRequestContext(collaboratorAccount),
        recipients: [DTOsHelper.getRecipientUser(collaboratorAccount)],
        inputData: {},
        outputData: {
          multiple_innovations: 'no',
          innovations_name: HandlersHelper.transformIntoBullet([innovationName]),
          dashboard_url: dashboardUrl(ServiceRoleEnum.INNOVATOR)
        },
        options: { includeSelf: true }
      });
    });

    it('should send an email to the user who was invited to collaborate in multiple innovations', async () => {
      const innovationNames = [randUserName(), randUserName()];
      jest.spyOn(RecipientsService.prototype, 'getUserCollaborations').mockResolvedValue(
        innovationNames.map(iName => ({
          collaborationId: randUuid(),
          status: InnovationExportRequestStatusEnum.PENDING,
          innovationId: randUuid(),
          innovationName: iName
        }))
      );

      await testEmails(AccountCreationHandler, 'CA02_ACCOUNT_CREATION_OF_COLLABORATOR', {
        notificationPreferenceType: 'ACCOUNT',
        requestUser: DTOsHelper.getUserRequestContext(collaboratorAccount),
        recipients: [DTOsHelper.getRecipientUser(collaboratorAccount)],
        inputData: {},
        outputData: {
          multiple_innovations: 'yes',
          innovations_name: HandlersHelper.transformIntoBullet(innovationNames),
          dashboard_url: dashboardUrl(ServiceRoleEnum.INNOVATOR)
        },
        options: { includeSelf: true }
      });
    });
  });

  describe('when requestId does not exist', () => {
    it('should not send in-app or emails', async () => {
      const handler = new AccountCreationHandler(
        {
          id: randUuid(),
          identityId: randUuid(),
          currentRole: { id: randUuid(), role: ServiceRoleEnum.INNOVATOR }
        } as any,
        {},
        MocksHelper.mockContext()
      );

      await handler.run();
      expect(handler.inApp).toHaveLength(0);
      expect(handler.emails).toHaveLength(0);
    });
  });
});
