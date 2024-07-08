import azureFunction from '.';

import { randUuid } from '@ngneat/falso';
import { InnovationSupportStatusEnum } from '@users/shared/enums';
import { AzureHttpTriggerBuilder, TestsHelper } from '@users/shared/tests';
import type { TestUserType } from '@users/shared/tests/builders/user.builder';
import { NotifyMeService } from '../_services/notify-me.service';
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

const mock = jest.spyOn(NotifyMeService.prototype, 'updateSubscription').mockResolvedValue();
const exampleDTO = {
  subscriptionType: 'INSTANTLY' as const,
  eventType: 'SUPPORT_UPDATED' as const,
  preConditions: {
    status: [InnovationSupportStatusEnum.ENGAGING as const],
    units: [randUuid()]
  },
  notificationType: 'SUPPORT_UPDATED' as const
};

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-notify-me-subscription-update Suite', () => {
  describe('200', () => {
    it('should update notify me', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.aliceQualifyingAccessor)
        .setParams({ subscriptionId: randUuid() })
        .setBody<BodyType>(exampleDTO)
        .call<never>(azureFunction);

      expect(result.body).toBeUndefined();
      expect(result.status).toBe(204);
      expect(mock).toHaveBeenCalledTimes(1);
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
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setParams({ subscriptionId: randUuid() })
        .setBody<BodyType>(exampleDTO)
        .call<never>(azureFunction);

      expect(result.status).toBe(status);
    });
  });
});
