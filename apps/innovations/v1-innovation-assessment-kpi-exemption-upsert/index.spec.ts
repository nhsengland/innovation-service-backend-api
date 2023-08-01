import azureFunction from '.';

import { AzureHttpTriggerBuilder, TestsHelper } from '@innovations/shared/tests';
import type { TestUserType } from '@innovations/shared/tests/builders/user.builder';
import { randText } from '@ngneat/falso';
import { InnovationAssessmentsService } from '../_services/innovation-assessments.service';
import type { BodyType, ParamsType } from './validation.schemas';

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

const mock = jest.spyOn(InnovationAssessmentsService.prototype, 'upsertExemption').mockResolvedValue();

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-innovation-assessment-kpi-exemption-upsert Suite', () => {
  const innovationId = scenario.users.johnInnovator.innovations.johnInnovation.id;
  const assessmentId = scenario.users.johnInnovator.innovations.johnInnovation.assessment.id;
  describe('201', () => {
    it('should return success', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.paulNeedsAssessor)
        .setParams<ParamsType>({ innovationId, assessmentId })
        .setBody<BodyType>({ reason: 'NO_RESPONSE', message: randText() })
        .call<never>(azureFunction);

      expect(result.body).toBeUndefined();
      expect(result.status).toBe(201);
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Access', () => {
    it.each([
      ['Admin', 403, scenario.users.allMighty],
      ['QA', 403, scenario.users.aliceQualifyingAccessor],
      ['NA', 201, scenario.users.paulNeedsAssessor],
      ['Innovation owner', 403, scenario.users.johnInnovator],
      ['Innovator', 403, scenario.users.ottoOctaviusInnovator]
    ])('access with user %s should give %i', async (_role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setParams<ParamsType>({ innovationId, assessmentId })
        .setBody<BodyType>({ reason: 'NO_RESPONSE' })
        .call<never>(azureFunction);

      expect(result.status).toBe(status);
    });
  });
});
