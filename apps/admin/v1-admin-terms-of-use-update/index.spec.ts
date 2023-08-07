import azureFunction from '.';

import { TermsOfUseTypeEnum } from '@admin/shared/enums';
import { AzureHttpTriggerBuilder, TestsHelper } from '@admin/shared/tests';
import type { TestUserType } from '@admin/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@admin/shared/types';
import { randText, randUuid } from '@ngneat/falso';
import { TermsOfUseService } from '../_services/terms-of-use.service';
import type { BodyType, ParamsType } from './validation.schemas';

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
const mock = jest.spyOn(TermsOfUseService.prototype, 'updateTermsOfUse').mockResolvedValue(expected);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-admin-terms-of-use-update Suite', () => {
  describe('200', () => {
    it('should update the organisation', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.allMighty)
        .setParams<ParamsType>({ touId: randUuid() })
        .setBody<BodyType>({
          name: randText(),
          touType: TermsOfUseTypeEnum.INNOVATOR
        })
        .call<never>(azureFunction);

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
        .setParams<ParamsType>({ touId: randUuid() })
        .setBody<BodyType>({
          name: randText(),
          touType: TermsOfUseTypeEnum.INNOVATOR
        })
        .call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(status);
    });
  });
});
