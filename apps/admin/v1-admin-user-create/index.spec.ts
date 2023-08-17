import azureFunction from '.';

import { ServiceRoleEnum } from '@admin/shared/enums';
import { AzureHttpTriggerBuilder, TestsHelper } from '@admin/shared/tests';
import type { TestUserType } from '@admin/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@admin/shared/types';
import { randEmail, randFullName, randUuid } from '@ngneat/falso';
import { UsersService } from '../_services/users.service';
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

const expected = { id: randUuid() };
const mock = jest.spyOn(UsersService.prototype, 'createUser').mockResolvedValue(expected);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-admin-user-create Suite', () => {
  describe('200', () => {
    it.each([ServiceRoleEnum.ADMIN, ServiceRoleEnum.ASSESSMENT] as const)(
      'should create a user with role %s',
      async role => {
        const result = await new AzureHttpTriggerBuilder()
          .setAuth(scenario.users.allMighty)
          .setBody<BodyType>({
            email: randEmail(),
            name: randFullName(),
            role: role
          })
          .call<never>(azureFunction);

        expect(result.body).toStrictEqual(expected);
        expect(result.status).toBe(200);
        expect(mock).toHaveBeenCalledTimes(1);
      }
    );

    it.each([ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR] as const)(
      'should create a user with role %s',
      async role => {
        const result = await new AzureHttpTriggerBuilder()
          .setAuth(scenario.users.allMighty)
          .setBody<BodyType>({
            email: randEmail(),
            name: randFullName(),
            role: role,
            organisationId: randUuid(),
            unitIds: [randUuid(), randUuid()]
          })
          .call<never>(azureFunction);

        expect(result.body).toStrictEqual(expected);
        expect(result.status).toBe(200);
        expect(mock).toHaveBeenCalledTimes(1);
      }
    );
  });

  describe('400', () => {
    it.each([ServiceRoleEnum.ADMIN, ServiceRoleEnum.ASSESSMENT] as const)(
      `should fail if role is %s and org/unit present`,
      async role => {
        const result = await new AzureHttpTriggerBuilder()
          .setAuth(scenario.users.allMighty)
          .setBody<BodyType>({
            email: randEmail(),
            name: randFullName(),
            role: role,
            organisationId: randUuid(),
            unitIds: [randUuid()]
          } as any)
          .call<never>(azureFunction);

        expect(result.status).toBe(400);
        expect(mock).toHaveBeenCalledTimes(0);
      }
    );

    it.each([ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR] as const)(
      `should fail if role is %s and org/unit missing`,
      async (role: any) => {
        const result = await new AzureHttpTriggerBuilder()
          .setAuth(scenario.users.allMighty)
          .setBody<BodyType>({
            email: randEmail(),
            name: randFullName(),
            role: role
          })
          .call<never>(azureFunction);

        expect(result.status).toBe(400);
        expect(mock).toHaveBeenCalledTimes(0);
      }
    );

    it('should fail if units is empty and role is A/QA', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.allMighty)
        .setBody<BodyType>({
          email: randEmail(),
          name: randFullName(),
          role: ServiceRoleEnum.ACCESSOR,
          organisationId: randUuid(),
          unitIds: []
        })
        .call<never>(azureFunction);

      expect(result.status).toBe(400);
      expect(mock).toHaveBeenCalledTimes(0);
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
        .setBody<BodyType>({
          email: randEmail(),
          name: randFullName(),
          role: ServiceRoleEnum.ADMIN
        })
        .call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(status);
    });
  });
});
