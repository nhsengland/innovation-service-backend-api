import azureFunction from '.';

import { InnovationStatusEnum } from '@innovations/shared/enums';
import { AzureHttpTriggerBuilder, TestsHelper } from '@innovations/shared/tests';
import type { TestUserType } from '@innovations/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@innovations/shared/types';
import { InnovationsService } from '../_services/innovations.service';
import type { ResponseDTO } from './transformation.dtos';
import type { QueryParamsType } from './validation.schemas';

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

const expected = 2;
const mock = jest
  .spyOn(InnovationsService.prototype, 'getNeedsAssessmentOverdueInnovations')
  .mockResolvedValue(expected);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-innovations-overdue-assessments Suite', () => {
  describe('200', () => {
    it('should return the overdue assessments', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.paulNeedsAssessor)
        .setQuery<QueryParamsType>({ status: [InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT], assignedToMe: true })
        .call<ResponseDTO>(azureFunction);

      expect(result.body).toStrictEqual({ overdue: expected });
      expect(result.status).toBe(200);
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Access', () => {
    it.each([
      ['Admin', 403, scenario.users.allMighty],
      ['QA', 403, scenario.users.aliceQualifyingAccessor],
      ['A', 403, scenario.users.ingridAccessor],
      ['NA', 200, scenario.users.paulNeedsAssessor],
      ['Innovator owner', 403, scenario.users.johnInnovator],
      ['Innovator collaborator', 403, scenario.users.janeInnovator]
    ])('access with user %s should give %i', async (_role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setQuery<QueryParamsType>({ status: [InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT], assignedToMe: true })
        .call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(status);
    });
  });
});
