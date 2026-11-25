import azureFunction from '.';

import { InnovationGroupedStatusEnum, ServiceRoleEnum } from '@innovations/shared/enums';
import { AzureHttpTriggerBuilder, TestsHelper } from '@innovations/shared/tests';
import type { TestUserType } from '@innovations/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@innovations/shared/types';
import { randProductName, randUuid } from '@ngneat/falso';
import { InnovationsService } from '../_services/innovations.service';
import type { ResponseDTO } from './transformation.dtos';

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
const mock = jest.spyOn(InnovationsService.prototype, 'getInnovationsList').mockResolvedValue(expected as any);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-innovations-list Suite', () => {
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
      ['NA', 200, scenario.users.paulNeedsAssessor],
      ['Innovator owner', 200, scenario.users.johnInnovator],
      ['Innovator collaborator', 200, scenario.users.janeInnovator]
    ])('access with user %s should give %i', async (_role: string, status: number, user: TestUserType) => {
      const call = await new AzureHttpTriggerBuilder().setAuth(user);

      if (user.roles[0]?.role === ServiceRoleEnum.INNOVATOR) {
        call.setQuery({ fields: 'name', hasAccessThrough: 'owner' });
      } else {
        call.setQuery({ fields: 'name' });
      }
      const result = await call.call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(status);
    });

    it('access with user A should give 200', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.ingridAccessor)
        .setQuery({ fields: 'name', supportStatuses: 'ENGAGING' })
        .call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(200);
    });
  });
});
