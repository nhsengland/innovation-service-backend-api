import { InnovatorAccountCreationHandler } from './innovator-account-creation.handler';
import { CompleteScenarioType, MocksHelper, TestsHelper } from '@notifications/shared/tests';
import { ServiceRoleEnum } from '@notifications/shared/enums';
import { ENV, EmailTypeEnum } from '../_config';
import { RecipientsService } from '../_services/recipients.service';

describe('Innovator account creation notification handler', () => {

  let handler: InnovatorAccountCreationHandler;
  let testsHelper: TestsHelper;
  let scenario: CompleteScenarioType;

  beforeAll(async () => {
    testsHelper = await new TestsHelper().init();
    scenario = testsHelper.getCompleteScenario();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
  });

  describe('Innovator creates account', () => {
    it('should send an email to the new user', async () => {
      const userContext = testsHelper.getUserContext(scenario.users.johnInnovator, ServiceRoleEnum.INNOVATOR);

      // mock recipients
      jest.spyOn(RecipientsService.prototype, 'getUsersRecipient').mockResolvedValue([
        {
          roleId: userContext.currentRole.id,
          role: userContext.currentRole.role,
          userId: scenario.users.johnInnovator.id,
          identityId: scenario.users.johnInnovator.identityId,
          isActive: true
        }
      ]);

      handler = new InnovatorAccountCreationHandler(userContext, {}, MocksHelper.mockContext());

      await handler.run();

      expect(handler.inApp).toHaveLength(0);
      expect(handler.emails).toHaveLength(1);
      expect(handler.emails[0]).toMatchObject({
        templateId: EmailTypeEnum.ACCOUNT_CREATION_TO_INNOVATOR,
        to: [
          {
            roleId: userContext.currentRole.id,
            role: userContext.currentRole.role,
            userId: userContext.id,
            identityId: userContext.identityId,
            isActive: true
          }
        ],
        notificationPreferenceType: null,
        params: {
          innovation_service_url: ENV.webBaseUrl
        }
      });
    });
  });
});
