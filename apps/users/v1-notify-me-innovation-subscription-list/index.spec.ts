import azureFunction from '.';

import { randUuid } from '@ngneat/falso';
import { InnovationSupportStatusEnum } from '@users/shared/enums';
import { AzureHttpTriggerBuilder, TestsHelper } from '@users/shared/tests';
import type { TestUserType } from '@users/shared/tests/builders/user.builder';
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

const expected = [
  {
    id: randUuid(),
    eventType: 'SUPPORT_UPDATED' as const,
    organisations: [
      {
        id: randUuid(),
        name: 'Org 1',
        acronym: 'O1',
        units: [
          {
            id: randUuid(),
            name: 'Unit 1',
            acronym: 'U1',
            isShadow: true
          }
        ]
      }
    ],
    status: [InnovationSupportStatusEnum.ENGAGING as const],
    subscriptionType: 'INSTANTLY' as const,
    updatedAt: new Date()
  }
];
const mock = jest.spyOn(NotifyMeService.prototype, 'getInnovationSubscriptions').mockResolvedValue(expected);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-notify-me-innovation-subscription-list Suite', () => {
  describe('200', () => {
    it('should list my custom notification for the innovation as %s', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.aliceQualifyingAccessor)
        .setParams({ innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id })
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
      ['NA', 403, scenario.users.paulNeedsAssessor],
      ['Innovator', 403, scenario.users.johnInnovator]
    ])('access with user %s should give %i', async (_role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setParams({ innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id })
        .call<never>(azureFunction);

      expect(result.status).toBe(status);
    });
  });
});
