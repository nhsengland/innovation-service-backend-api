import { CompleteScenarioType, MocksHelper, TestsHelper } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { ENV } from '../../_config';
import { RecipientsService } from '../../_services/recipients.service';
import { InnovatorAccountCreationHandler } from './innovator-account-creation.handler';

describe('Innovator account creation notification handler', () => {
  let testsHelper: TestsHelper;
  let scenario: CompleteScenarioType;

  beforeAll(async () => {
    testsHelper = await new TestsHelper().init();
    scenario = testsHelper.getCompleteScenario();
  });

  describe('Innovator creates account', () => {
    it('should send an email to the new user', async () => {
      const userContext = DTOsHelper.getUserRequestContext(scenario.users.johnInnovator);

      // mock recipients
      jest
        .spyOn(RecipientsService.prototype, 'getUsersRecipient')
        .mockResolvedValueOnce(DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'));

      const handler = new InnovatorAccountCreationHandler(userContext, {}, MocksHelper.mockContext());

      await handler.run();

      expect(handler.inApp).toHaveLength(0);
      expect(handler.emails).toHaveLength(1);
      expect(handler.emails[0]).toMatchObject({
        templateId: 'ACCOUNT_CREATION_TO_INNOVATOR',
        to: {
          roleId: userContext.currentRole.id,
          role: userContext.currentRole.role,
          userId: userContext.id,
          identityId: userContext.identityId,
          isActive: true
        },
        notificationPreferenceType: null,
        params: {
          innovation_service_url: ENV.webBaseUrl
        }
      });
    });

    it('should not send an email when no recipients are found', async () => {
      const userContext = DTOsHelper.getUserRequestContext(scenario.users.johnInnovator);

      // mock recipients
      jest.spyOn(RecipientsService.prototype, 'getUsersRecipient').mockResolvedValueOnce(null);

      const handler = new InnovatorAccountCreationHandler(userContext, {}, MocksHelper.mockContext());

      await handler.run();

      expect(handler.inApp).toHaveLength(0);
      expect(handler.emails).toHaveLength(0);
    });
  });
});
