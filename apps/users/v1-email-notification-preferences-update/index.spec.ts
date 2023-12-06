import azureFunction from '.';

import type { ServiceRoleEnum } from '@users/shared/enums';
import { AzureHttpTriggerBuilder, TestsHelper } from '@users/shared/tests';
import type { TestUserType } from '@users/shared/tests/builders/user.builder';
import {
  ANotificationCategories,
  INotificationCategories,
  NaNotificationCategories,
  QANotificationCategories,
  generatePreferencesObject,
  type ErrorResponseType
} from '@users/shared/types';
import { NotificationsService } from '../_services/notifications.service';
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
    it('should update the email notification preferences info as a NA', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.paulNeedsAssessor)
        .setBody<BodyType>({
          preferences: generatePreferencesObject<ServiceRoleEnum.ASSESSMENT>(NaNotificationCategories)
        })
        .call<never>(azureFunction);

      expect(result.body).toBeUndefined();
      expect(result.status).toBe(204);
      expect(mock).toHaveBeenCalledTimes(1);
    });
    it('should update the email notification preferences info as an A', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.ingridAccessor)
        .setBody<BodyType>({
          preferences: generatePreferencesObject<ServiceRoleEnum.ACCESSOR>(ANotificationCategories)
        })
        .call<never>(azureFunction);

      expect(result.body).toBeUndefined();
      expect(result.status).toBe(204);
      expect(mock).toHaveBeenCalledTimes(1);
    });
    it('should update the email notification preferences info as a QA', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.aliceQualifyingAccessor)
        .setBody<BodyType>({
          preferences: generatePreferencesObject<ServiceRoleEnum.QUALIFYING_ACCESSOR>(QANotificationCategories)
        })
        .call<never>(azureFunction);

      expect(result.body).toBeUndefined();
      expect(result.status).toBe(204);
      expect(mock).toHaveBeenCalledTimes(1);
    });
    it('should update the email notification preferences info as an I', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.adamInnovator)
        .setBody<BodyType>({
          preferences: generatePreferencesObject<ServiceRoleEnum.INNOVATOR>(INotificationCategories)
        })
        .call<never>(azureFunction);

      expect(result.body).toBeUndefined();
      expect(result.status).toBe(204);
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Access', () => {
    it.each([['Admin', 403, scenario.users.allMighty]])(
      'access with user %s should give %i',
      async (_role: string, status: number, user: TestUserType) => {
        const result = await new AzureHttpTriggerBuilder()
          .setAuth(user)
          .setBody<BodyType>({
            preferences: generatePreferencesObject<ServiceRoleEnum.ASSESSMENT>(NaNotificationCategories)
          })
          .call<ErrorResponseType>(azureFunction);

        expect(result.status).toBe(status);
      }
    );
  });
});
