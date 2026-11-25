import azureFunction from '.';

import { AzureHttpTriggerBuilder, TestsHelper } from '@innovations/shared/tests';
import type { TestUserType } from '@innovations/shared/tests/builders/user.builder';
import { randPastDate, randText } from '@ngneat/falso';
import { InnovationAssessmentsService } from '../_services/innovation-assessments.service';
import type { ResponseDTO } from './transformation.dtos';
import type { ParamsType } from './validation.schemas';

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

const expected: Awaited<ReturnType<InnovationAssessmentsService['getExemption']>> = {
  isExempted: true,
  exemption: {
    reason: 'TECHNICAL_DIFFICULTIES',
    message: randText(),
    exemptedAt: randPastDate()
  }
};
const mock = jest.spyOn(InnovationAssessmentsService.prototype, 'getExemption').mockResolvedValue(expected);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-innovation-assessment-kpi-exemption-info', () => {
  const innovationId = scenario.users.johnInnovator.innovations.johnInnovation.id;
  const assessmentId = scenario.users.johnInnovator.innovations.johnInnovation.assessment.id;

  describe('200', () => {
    it('should return success', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.paulNeedsAssessor)
        .setParams<ParamsType>({ innovationId, assessmentId })
        .call<ResponseDTO>(azureFunction);

      expect(result.body).toStrictEqual(expected);
      expect(result.status).toBe(200);
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Access', () => {
    it.each([
      ['Admin', 403, scenario.users.allMighty],
      ['QA', 403, scenario.users.aliceQualifyingAccessor],
      ['A', 403, scenario.users.samAccessor],
      ['NA', 200, scenario.users.paulNeedsAssessor],
      ['Innovator', 403, scenario.users.johnInnovator],
      ['Outside innovator', 403, scenario.users.ottoOctaviusInnovator]
    ])('access with user %s should give %i', async (_role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setParams<ParamsType>({ innovationId, assessmentId })
        .call<ResponseDTO>(azureFunction);

      expect(result.status).toBe(status);
    });
  });
});
