import azureFunction from '.';

import { randNumber, randPastDate, randProductName, randUuid } from '@ngneat/falso';
import type { NotificationCategoryType, NotificationDetailType } from '@users/shared/enums';
import { InnovationStatusEnum } from '@users/shared/enums';
import { AzureHttpTriggerBuilder, TestsHelper } from '@users/shared/tests';
import type { TestUserType } from '@users/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@users/shared/types';
import { omit } from 'lodash';
import { NotificationsService } from '../_services/notifications.service';
import type { ResponseDTO } from './transformation.dtos';

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

const expected = {
  total: randNumber(),
  data: [
    {
      id: randUuid(),
      innovation: {
        id: randUuid(),
        name: randProductName(),
        status: InnovationStatusEnum.CREATED
      },
      contextType: 'TASK' as NotificationCategoryType,
      contextDetail: 'TA01_TASK_CREATION_TO_INNOVATOR' as NotificationDetailType,
      contextId: randUuid(),
      createdAt: randPastDate(),
      readAt: null,
      params: {}
    }
  ]
};
const mock = jest.spyOn(NotificationsService.prototype, 'getUserNotifications').mockResolvedValue(expected);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-me-notifications-list Suite', () => {
  describe('200', () => {
    it('should list the notifications', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .call<ResponseDTO>(azureFunction);

      expect(result.body).toStrictEqual({ ...omit(expected, 'total'), count: expected.total });
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
      const result = await new AzureHttpTriggerBuilder().setAuth(user).call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(status);
    });
  });
});
