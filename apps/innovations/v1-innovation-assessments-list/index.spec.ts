import azureFunction from '.';

import { AzureHttpTriggerBuilder, TestsHelper } from '@innovations/shared/tests';
import type { TestUserType } from '@innovations/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@innovations/shared/types';
import { randPastDate, randUuid } from '@ngneat/falso';
import type { ResponseDTO } from './transformation.dtos';
import type { ParamsType } from './validation.schemas';
import { InnovationAssessmentsService } from '../_services/innovation-assessments.service';

jest.mock('@innovations/shared/decorators', () => ({
  JwtDecoder: jest.fn().mockImplementation(() => (_: any, __: string, descriptor: PropertyDescriptor) => {
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
    majorVersion: 2,
    minorVersion: 0,
    startedAt: randPastDate(),
    finishedAt: new Date()
  },
  {
    id: randUuid(),
    majorVersion: 1,
    minorVersion: 0,
    startedAt: randPastDate(),
    finishedAt: new Date()
  }
];
const mock = jest.spyOn(InnovationAssessmentsService.prototype, 'getAssessmentsList').mockResolvedValue(expected);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-innovation-assessments-list Suite', () => {
  describe('200', () => {
    it('should return the completed assessments list', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .setParams<ParamsType>({ innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id })
        .call<ResponseDTO>(azureFunction);

      expect(result.body).toMatchObject(expected);
      expect(result.status).toBe(200);
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Access', () => {
    it.each([
      ['Admin', 200, scenario.users.allMighty],
      ['QA', 200, scenario.users.aliceQualifyingAccessor],
      ['NA', 200, scenario.users.paulNeedsAssessor],
      ['Innovator', 200, scenario.users.johnInnovator],
      ['Innovator other', 403, scenario.users.ottoOctaviusInnovator]
    ])('access with user %s should give %i', async (_role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setParams<ParamsType>({ innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id })
        .call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(status);
    });
  });
});
