import azureFunction from '.';

import { NotificationPreferenceEnum } from '@users/shared/enums';
import { AzureHttpTriggerBuilder, TestsHelper } from '@users/shared/tests';
import type { TestUserType } from '@users/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@users/shared/types';
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
    it('should return the email notification preferences info as a NA', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.paulNeedsAssessor)
        .setBody<BodyType>({
          preferences: {
            ASSIGN_NA: NotificationPreferenceEnum.NO,
            INNOVATION_MANAGEMENT: NotificationPreferenceEnum.YES,
            INNOVATOR_SUBMIT_IR: NotificationPreferenceEnum.YES,
            MESSAGE: NotificationPreferenceEnum.NO,
            TASK: NotificationPreferenceEnum.YES
          }
        })
        .call<never>(azureFunction);

      expect(result.body).toBeUndefined();
      expect(result.status).toBe(204);
      expect(mock).toHaveBeenCalledTimes(1);
    });
    it('should return the email notification preferences info as an A', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.ingridAccessor)
        .setBody<BodyType>({
          preferences: {
            ACCOUNT: NotificationPreferenceEnum.YES,
            EXPORT_REQUEST: NotificationPreferenceEnum.YES,
            INNOVATION_MANAGEMENT: NotificationPreferenceEnum.YES,
            MESSAGE: NotificationPreferenceEnum.YES,
            REMINDER: NotificationPreferenceEnum.YES,
            SUPPORT: NotificationPreferenceEnum.YES,
            TASK: NotificationPreferenceEnum.YES
          }
        })
        .call<never>(azureFunction);

      expect(result.body).toBeUndefined();
      expect(result.status).toBe(204);
      expect(mock).toHaveBeenCalledTimes(1);
    });
    it('should return the email notification preferences info as a QA', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.aliceQualifyingAccessor)
        .setBody<BodyType>({
          preferences: {
            ACCOUNT: NotificationPreferenceEnum.YES,
            EXPORT_REQUEST: NotificationPreferenceEnum.YES,
            INNOVATION_MANAGEMENT: NotificationPreferenceEnum.YES,
            MESSAGE: NotificationPreferenceEnum.YES,
            REMINDER: NotificationPreferenceEnum.YES,
            SUGGEST_SUPPORT: NotificationPreferenceEnum.YES,
            SUPPORT: NotificationPreferenceEnum.YES,
            TASK: NotificationPreferenceEnum.YES
          }
        })
        .call<never>(azureFunction);

      expect(result.body).toBeUndefined();
      expect(result.status).toBe(204);
      expect(mock).toHaveBeenCalledTimes(1);
    });
    it('should return the email notification preferences info as an I', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.adamInnovator)
        .setBody<BodyType>({
          preferences: {
            DOCUMENT: NotificationPreferenceEnum.YES,
            MESSAGE: NotificationPreferenceEnum.YES,
            REMINDER: NotificationPreferenceEnum.YES,
            SUPPORT: NotificationPreferenceEnum.YES,
            TASK: NotificationPreferenceEnum.YES
          }
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
            preferences: {
              ASSIGN_NA: NotificationPreferenceEnum.NO,
              INNOVATION_MANAGEMENT: NotificationPreferenceEnum.YES,
              INNOVATOR_SUBMIT_IR: NotificationPreferenceEnum.YES,
              MESSAGE: NotificationPreferenceEnum.NO,
              TASK: NotificationPreferenceEnum.YES
            }
          })
          .call<ErrorResponseType>(azureFunction);

        expect(result.status).toBe(status);
      }
    );
  });
});
