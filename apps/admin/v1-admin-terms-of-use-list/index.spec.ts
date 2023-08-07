import azureFunction from '.';

import { TermsOfUseTypeEnum } from '@admin/shared/enums';
import { AzureHttpTriggerBuilder, TestsHelper } from '@admin/shared/tests';
import type { TestUserType } from '@admin/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@admin/shared/types';
import { randPastDate, randText, randUuid } from '@ngneat/falso';
import { TermsOfUseService } from '../_services/terms-of-use.service';

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
  count: 1,
  data: [
    {
      id: randUuid(),
      name: randText(),
      createdAt: randPastDate(),
      releasedAt: randPastDate(),
      summary: randText(),
      touType: TermsOfUseTypeEnum.INNOVATOR
    }
  ]
};
const mock = jest.spyOn(TermsOfUseService.prototype, 'getTermsOfUseList').mockResolvedValue(expected);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-admin-terms-of-use-list Suite', () => {
  describe('200', () => {
    it('should list the terms of use', async () => {
      const result = await new AzureHttpTriggerBuilder().setAuth(scenario.users.allMighty).call<never>(azureFunction);

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
      const result = await new AzureHttpTriggerBuilder().setAuth(user).call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(status);
    });
  });
});
