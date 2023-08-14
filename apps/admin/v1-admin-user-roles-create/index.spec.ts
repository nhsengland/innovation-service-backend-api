import azureFunction from '.';

import { ServiceRoleEnum } from '@admin/shared/enums';
import { AzureHttpTriggerBuilder, TestsHelper } from '@admin/shared/tests';
import type { TestUserType } from '@admin/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@admin/shared/types';
import { randUuid } from '@ngneat/falso';
import { UsersService } from '../_services/users.service';
import type { ResponseDTO } from './transformation.dtos';
import type { BodyType } from './validation.schemas';

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

const expected = [{ id: randUuid() }];
const mock = jest.spyOn(UsersService.prototype, 'addRoles').mockResolvedValue(expected);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-admin-user-roles-create Suite', () => {
  describe('201', () => {
    it.each([
      ServiceRoleEnum.ACCESSOR,
      ServiceRoleEnum.QUALIFYING_ACCESSOR,
      ServiceRoleEnum.ADMIN,
      ServiceRoleEnum.ASSESSMENT
    ])('should create a role for %s', async (role: any) => {
      const isAccessor = role === ServiceRoleEnum.ACCESSOR || role === ServiceRoleEnum.QUALIFYING_ACCESSOR;

      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.allMighty)
        .setParams({ userId: randUuid() })
        .setBody<BodyType>({
          roles: [
            {
              role: role,
              ...(isAccessor ? { orgId: randUuid(), unitId: randUuid() } : {})
            }
          ]
        })
        .call<ResponseDTO>(azureFunction);

      expect(result.body).toStrictEqual(expected);
      expect(result.status).toBe(201);
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('400', () => {
    it.each([
      ServiceRoleEnum.ACCESSOR,
      ServiceRoleEnum.QUALIFYING_ACCESSOR,
      ServiceRoleEnum.ADMIN,
      ServiceRoleEnum.ASSESSMENT
    ])('should throw error when payload is not valid for role type', async (role: any) => {
      const isAccessor = role === ServiceRoleEnum.ACCESSOR || role === ServiceRoleEnum.QUALIFYING_ACCESSOR;

      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.allMighty)
        .setParams({ userId: randUuid() })
        .setBody<BodyType>({
          roles: [
            {
              role: role,
              ...(!isAccessor ? { orgId: randUuid(), unitId: randUuid() } : {})
            }
          ]
        })
        .call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(400);
    });
  });

  describe('Access', () => {
    it.each([
      ['Admin', 201, scenario.users.allMighty],
      ['QA', 403, scenario.users.aliceQualifyingAccessor],
      ['A', 403, scenario.users.ingridAccessor],
      ['NA', 403, scenario.users.paulNeedsAssessor],
      ['Innovator', 403, scenario.users.johnInnovator]
    ])('access with user %s should give %i', async (_role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setParams({ userId: randUuid() })
        .setBody<BodyType>({
          roles: [{ role: ServiceRoleEnum.ASSESSMENT }]
        })
        .call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(status);
    });
  });
});
