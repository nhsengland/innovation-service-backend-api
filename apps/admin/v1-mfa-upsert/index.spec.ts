import azureFunction from '.';

import { AzureHttpTriggerBuilder, TestsHelper } from '@admin/shared/tests';
import type { TestUserType } from '@admin/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@admin/shared/types';
import { randPhoneNumber } from '@ngneat/falso';
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

const mock = jest.spyOn(UsersService.prototype, 'upsertUserMfa').mockResolvedValue();

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-me-mfa-upsert Suite', () => {
  describe('204', () => {
    it.each([['none'], ['email'], ['phone']])('should update the user mfa as to %s', async type => {
      let body: BodyType;
      if (type === 'phone') {
        body = {
          type,
          phoneNumber: randPhoneNumber()
        };
      } else {
        body = { type: type as 'none' | 'email' };
      }

      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.allMighty)
        .setParams({ userId: scenario.users.johnInnovator.id })
        .setBody<BodyType>(body)
        .call<never>(azureFunction);

      expect(result.status).toBe(204);
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Access', () => {
    it.each([
      ['Admin', 204, scenario.users.allMighty],
      ['QA', 403, scenario.users.aliceQualifyingAccessor],
      ['A', 403, scenario.users.ingridAccessor],
      ['NA', 403, scenario.users.paulNeedsAssessor],
      ['Innovator', 403, scenario.users.johnInnovator]
    ])('access with user %s should give %i', async (_role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setParams({ userId: scenario.users.johnInnovator.id })
        .setBody<BodyType>({ type: 'none' })
        .call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(status);
    });
  });
});
