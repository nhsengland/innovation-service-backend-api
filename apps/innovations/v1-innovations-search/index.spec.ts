import azureFunction from '.';

import { InnovationGroupedStatusEnum } from '@innovations/shared/enums';
import { AzureHttpTriggerBuilder, TestsHelper } from '@innovations/shared/tests';
import type { TestUserType } from '@innovations/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@innovations/shared/types';
import { randProductName, randUuid } from '@ngneat/falso';
import type { ResponseDTO } from './transformation.dtos';
import { SearchService } from '../_services/search.service';

jest.mock('@innovations/shared/decorators', () => ({
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
      id: randUuid(),
      name: randProductName(),
      groupedStatus: InnovationGroupedStatusEnum.RECORD_NOT_SHARED
    },
    {
      id: randUuid(),
      name: randProductName(),
      groupedStatus: InnovationGroupedStatusEnum.AWAITING_SUPPORT
    }
  ]
};
const mock = jest.spyOn(SearchService.prototype, 'getDocuments').mockResolvedValue(expected as any);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-innovations-search Suite', () => {
  describe('200', () => {
    it('should return the innovations', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.aliceQualifyingAccessor)
        .setQuery({
          fields: 'id,name,groupedStatus'
        })
        .call<ResponseDTO>(azureFunction);

      expect(result.body).toStrictEqual(expected);
      expect(result.status).toBe(200);
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('400', () => {
    it('should return bad request on invalid parameters', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.aliceQualifyingAccessor)
        .setQuery({ invalid: 'invalid' })
        .call<ResponseDTO>(azureFunction);

      expect(result.status).toBe(400);
    });
  });

  describe('Access', () => {
    it.each([
      ['Admin', 200, scenario.users.allMighty],
      ['QA', 200, scenario.users.aliceQualifyingAccessor],
      ['A', 200, scenario.users.ingridAccessor],
      ['NA', 200, scenario.users.paulNeedsAssessor],
      ['Innovator owner', 403, scenario.users.johnInnovator],
      ['Innovator collaborator', 403, scenario.users.janeInnovator]
    ])('access with user %s should give %i', async (_role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder().setAuth(user).setQuery({ fields: 'name' }).call<ErrorResponseType>(azureFunction);
      expect(result.status).toBe(status);
    });
  });
});
