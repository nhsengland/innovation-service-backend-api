import azureFunction from '.';

import { randNumber } from '@ngneat/falso';
import { AzureHttpTriggerBuilder, TestsHelper } from '@users/shared/tests';
import type { TestUserType } from '@users/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@users/shared/types';
import { UserStatisticsEnum } from '../_enums/user.enums';
import { StatisticsHandlersHelper } from '../_helpers/handlers.helper';
import type { QueryType } from './validation.schemas';

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

const expected = { WAITING_ASSESSMENT_COUNTER: { count: randNumber(), overdue: randNumber() } };
const mock = jest.spyOn(StatisticsHandlersHelper, 'runHandler').mockResolvedValue(expected);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-users-statistics', () => {
  describe('200', () => {
    it('should return the user statistics', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.aliceQualifyingAccessor)
        .setQuery<QueryType>({ statistics: [UserStatisticsEnum.WAITING_ASSESSMENT_COUNTER] })
        .call<never>(azureFunction);

      expect(result.body).toStrictEqual(expected);
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
        .setQuery<QueryType>({ statistics: [UserStatisticsEnum.WAITING_ASSESSMENT_COUNTER] })
        .call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(status);
    });
  });
});
