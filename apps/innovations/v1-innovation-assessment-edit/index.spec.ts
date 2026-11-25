import v1InnovationAssessmentEdit from '.';

import { AzureHttpTriggerBuilder, TestsHelper } from '@innovations/shared/tests';
import type { TestUserType } from '@innovations/shared/tests/builders/user.builder';
import { randText, randUuid } from '@ngneat/falso';
import { InnovationAssessmentsService } from '../_services/innovation-assessments.service';
import type { ResponseDTO } from './transformation.dtos';
import type { BodyType, ParamsType } from './validation.schemas';

jest.mock('@innovations/shared/decorators', () => ({
  JwtDecoder: jest.fn().mockImplementation(() => (_: any, __: string, descriptor: PropertyDescriptor) => {
    return descriptor;
  }),
  Audit: jest.fn().mockImplementation(() => (_: any, __: string, descriptor: PropertyDescriptor) => {
    return descriptor;
  }),
  ElasticSearchDocumentUpdate: jest.fn(() => (_: any, __: string, descriptor: PropertyDescriptor) => descriptor)
}));

const testsHelper = new TestsHelper();
const scenario = testsHelper.getCompleteScenario();

beforeAll(async () => {
  await testsHelper.init();
});

const expected = { id: randUuid() };
const mock = jest.spyOn(InnovationAssessmentsService.prototype, 'editInnovationAssessment').mockResolvedValue(expected);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-innovation-assessment-edit', () => {
  const innovationId = scenario.users.johnInnovator.innovations.johnInnovation.id;
  describe('200', () => {
    it('should return success', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.paulNeedsAssessor)
        .setParams<ParamsType>({ innovationId })
        .setBody<BodyType>({ reason: randText() })
        .call<ResponseDTO>(v1InnovationAssessmentEdit);

      expect(result.body).toMatchObject(expected);
      expect(result.status).toBe(200);
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Access', () => {
    it.each([
      ['Admin', 403, scenario.users.allMighty],
      ['QA', 403, scenario.users.aliceQualifyingAccessor],
      ['NA', 200, scenario.users.paulNeedsAssessor],
      ['Innovator', 403, scenario.users.johnInnovator]
    ])('access with user %s should give %i', async (_role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setParams<ParamsType>({ innovationId })
        .setBody<BodyType>({ reason: randText() })
        .call<ResponseDTO>(v1InnovationAssessmentEdit);

      expect(result.status).toBe(status);
    });

    it('fails if innovation status != "IN_PROGRESS"', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.paulNeedsAssessor)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovationArchived.id
        })
        .setBody<BodyType>({ reason: randText() })
        .call<ResponseDTO>(v1InnovationAssessmentEdit);

      expect(result.status).toBe(403);
    });
  });
});
