import azureFunction from '.';

import { AzureHttpTriggerBuilder, TestsHelper } from '@admin/shared/tests';
import type { TestUserType } from '@admin/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@admin/shared/types';
import { randCompanyName, randFirstName, randLastName, randUuid } from '@ngneat/falso';
import type { ResponseDTO } from './transformation.dtos';
import { ServiceRoleEnum } from '@admin/shared/enums';
import { UsersService } from '../_services/users.service';

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

const expected = {
  count: 2,
  data: [
    {
      innovation: { id: randUuid(), name: randFirstName() },
      supportedBy: [{ id: randUuid(), name: randLastName(), role: ServiceRoleEnum.ACCESSOR }],
      unit: randCompanyName()
    },
    {
      innovation: { id: randUuid(), name: randFirstName() },
      supportedBy: [{ id: randUuid(), name: randLastName(), role: ServiceRoleEnum.QUALIFYING_ACCESSOR }],
      unit: randCompanyName()
    }
  ]
};
const mock = jest.spyOn(UsersService.prototype, 'getAssignedInnovations').mockResolvedValue(expected);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-admin-user-innovations Suite', () => {
  const johnInnovator = scenario.users.johnInnovator;

  describe('200', () => {
    it('should return the innovations owned by the user', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.allMighty)
        .setParams({ userId: johnInnovator.id })
        .call<ResponseDTO>(azureFunction);

      expect(result.body).toStrictEqual(expected);
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
        .setParams({ userId: johnInnovator.id })
        .call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(status);
    });
  });
});
