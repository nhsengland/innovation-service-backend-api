import azureFunction from '.';

import { AzureHttpTriggerBuilder, TestsHelper } from '@admin/shared/tests';
import type { TestUserType } from '@admin/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@admin/shared/types';
import { randUuid } from '@ngneat/falso';
import * as AdminOperationsConfig from '../_config/admin-operations.config';
import type { ParamsType, QueryParamsType } from './validation.schemas';

jest.mock('@admin/shared/decorators', () => ({
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

const expected = [{ rule: AdminOperationsConfig.ValidationRuleEnum.AssessmentUserIsNotTheOnlyOne, valid: true }];
const mock = jest.spyOn(AdminOperationsConfig, 'validationsHelper').mockResolvedValue(expected);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-admin-validate Suite', () => {
  describe('200', () => {
    it('should validate the operation', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.allMighty)
        .setParams<ParamsType>({ userId: randUuid() })
        .setQuery<QueryParamsType>({
          operation: AdminOperationsConfig.AdminOperationEnum.INACTIVATE_USER_ROLE,
          roleId: randUuid()
        })
        .call<never>(azureFunction);

      expect(result.body).toStrictEqual({ validations: expected });
      expect(result.status).toBe(200);
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Access', () => {
    it.each([
      ['Admin', 200, scenario.users.allMighty],
      ['QA', 403, scenario.users.aliceQualifyingAccessor],
      ['A', 403, scenario.users.ingridAccessor],
      ['NA', 403, scenario.users.paulNeedsAssessor],
      ['Innovator', 403, scenario.users.johnInnovator]
    ])('access with user %s should give %i', async (_role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setParams<ParamsType>({ userId: randUuid() })
        .setQuery<QueryParamsType>({
          operation: AdminOperationsConfig.AdminOperationEnum.INACTIVATE_USER_ROLE,
          roleId: randUuid()
        })
        .call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(status);
    });
  });
});
