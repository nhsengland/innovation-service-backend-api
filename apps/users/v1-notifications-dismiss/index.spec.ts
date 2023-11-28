import azureFunction from '.';

import { randNumber } from '@ngneat/falso';
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

const expected = randNumber();
const mock = jest.spyOn(NotificationsService.prototype, 'dismissUserNotifications').mockResolvedValue(expected);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-me-notifications-dismiss Suite', () => {
  describe('200', () => {
    it('should dismiss the notifications', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .setBody<BodyType>({
          notificationIds: [],
          contextIds: [],
          contextTypes: [],
          contextDetails: [],
          dismissAll: true
        })
        .call<ResponseDTO>(azureFunction);

      expect(result.body).toStrictEqual({ affected: expected });
      expect(result.status).toBe(200);
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Access', () => {
    it.each([
      ['Admin', 403, scenario.users.allMighty],
      ['QA', 200, scenario.users.aliceQualifyingAccessor],
      ['A', 200, scenario.users.ingridAccessor],
      ['NA', 200, scenario.users.paulNeedsAssessor],
      ['Innovator', 200, scenario.users.johnInnovator]
    ])('access with user %s should give %i', async (_role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setBody<BodyType>({
          notificationIds: [],
          contextIds: [],
          contextTypes: [],
          contextDetails: [],
          dismissAll: true
        })
        .call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(status);
    });
  });
});
