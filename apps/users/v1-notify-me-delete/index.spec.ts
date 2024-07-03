import azureFunction from '.';

import { randUuid } from '@ngneat/falso';
import { AzureHttpTriggerBuilder, TestsHelper } from '@users/shared/tests';
import type { TestUserType } from '@users/shared/tests/builders/user.builder';
import { DTOsHelper } from '@users/shared/tests/helpers/dtos.helper';
import { NotifyMeService } from '../_services/notify-me.service';

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

const mock = jest.spyOn(NotifyMeService.prototype, 'deleteSubscriptions').mockResolvedValue();

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-notify-me-delete Suite', () => {
  describe('204', () => {
    it('should delete all notify me subscriptions', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.aliceQualifyingAccessor)
        .call<never>(azureFunction);

      expect(result.body).toBeUndefined();
      expect(result.status).toBe(204);
      expect(mock).toHaveBeenCalledTimes(1);
      expect(mock).toHaveBeenCalledWith(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        undefined
      );
    });

    it('should delete notify me subscriptions by id', async () => {
      const subscriptions = [randUuid(), randUuid()];
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.aliceQualifyingAccessor)
        .setQuery({ ids: subscriptions })
        .call<never>(azureFunction);

      expect(result.body).toBeUndefined();
      expect(result.status).toBe(204);
      expect(mock).toHaveBeenCalledTimes(1);
      expect(mock).toHaveBeenCalledWith(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        subscriptions
      );
    });
  });

  describe('Access', () => {
    it.each([
      ['Admin', 403, scenario.users.allMighty],
      ['QA', 204, scenario.users.aliceQualifyingAccessor],
      ['A', 204, scenario.users.ingridAccessor],
      ['NA', 403, scenario.users.paulNeedsAssessor],
      ['Innovator', 403, scenario.users.johnInnovator]
    ])('access with user %s should give %i', async (_role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder().setAuth(user).call<never>(azureFunction);

      expect(result.status).toBe(status);
    });
  });
});
