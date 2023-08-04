import azureFunction from '.';

import { EmailNotificationPreferenceEnum } from '@users/shared/enums';
import { AzureHttpTriggerBuilder, TestsHelper } from '@users/shared/tests';
import type { TestUserType } from '@users/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@users/shared/types';
import { NotificationsService } from '../_services/notifications.service';
import type { ResponseDTO } from './transformation.dtos';
import type { BodyType } from './validation.schemas';

jest.mock('@users/shared/decorators', () => ({
  JwtDecoder: jest.fn().mockImplementation(() => (_: any, __: string, descriptor: PropertyDescriptor) => {
    return descriptor;
  }),
  Audit: jest.fn().mockImplementation(() => (_: any, __: string, descriptor: PropertyDescriptor) => {
    return descriptor;
  })
}));

const testsHelper = new TestsHelper();
const scenario = testsHelper.getCompleteScenario();

beforeAll(async () => {
  await testsHelper.init();
});

const mock = jest.spyOn(NotificationsService.prototype, 'upsertUserEmailPreferences').mockResolvedValue();

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-email-notification-preferences-update Suite', () => {
  describe('204', () => {
    it('should return the email notification preferences info', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.aliceQualifyingAccessor)
        .setBody<BodyType>([{ preference: EmailNotificationPreferenceEnum.DAILY, notificationType: 'ACTION' }])
        .call<ResponseDTO>(azureFunction);

      expect(result.body).toBeUndefined();
      expect(result.status).toBe(204);
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Access', () => {
    it.each([
      ['Admin', 403, scenario.users.allMighty],
      ['QA', 204, scenario.users.aliceQualifyingAccessor],
      ['A', 204, scenario.users.ingridAccessor],
      ['NA', 204, scenario.users.paulNeedsAssessor],
      ['Innovator', 204, scenario.users.johnInnovator]
    ])('access with user %s should give %i', async (_role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setBody<BodyType>([{ preference: EmailNotificationPreferenceEnum.DAILY, notificationType: 'ACTION' }])
        .call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(status);
    });
  });
});
