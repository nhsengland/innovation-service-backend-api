import { AzureHttpTriggerBuilder, TestsHelper } from '@innovations/shared/tests';
import type { TestUserType } from '@innovations/shared/tests/builders/user.builder';
import v1InnovationAssessmentAssessorUpdate from '.';
import { InnovationAssessmentsService } from '../_services/innovation-assessments.service';
import type { ResponseDTO } from './transformation.dtos';
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

const mock = jest
  .spyOn(InnovationAssessmentsService.prototype, 'updateAssessor')
  .mockImplementation((_c, _innovation, assessment, assessor) =>
    Promise.resolve({ assessmentId: assessment, assessorId: assessor })
  );

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-innovation-assessment-assessor-update Suite', () => {
  const assessmentId =
    scenario.users.ottoOctaviusInnovator.innovations.brainComputerInterfaceInnovation.assessmentInProgress.id;
  const assessorId = scenario.users.paulNeedsAssessor.id;
  const innovationId = scenario.users.ottoOctaviusInnovator.innovations.brainComputerInterfaceInnovation.id;
  describe('200', () => {
    it('should return success', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.paulNeedsAssessor)
        .setParams<ParamsType>({ innovationId, assessmentId })
        .setBody<BodyType>({ assessorId })
        .call<ResponseDTO>(v1InnovationAssessmentAssessorUpdate);

      expect(result.body).toMatchObject({ assessmentId, assessorId });
      expect(result.status).toBe(200);
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Access', () => {
    it.each([
      ['Admin', 403, scenario.users.allMighty],
      ['QA', 403, scenario.users.aliceQualifyingAccessor],
      ['NA', 200, scenario.users.paulNeedsAssessor],
      ['Innovator', 403, scenario.users.ottoOctaviusInnovator]
    ])('access with user %s should give %i', async (_role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setParams<ParamsType>({ innovationId, assessmentId })
        .setBody<BodyType>({ assessorId })
        .call<ResponseDTO>(v1InnovationAssessmentAssessorUpdate);

      expect(result.status).toBe(status);
    });

    it('fails if innovation status != "NEEDS_ASSESSMENT"', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.paulNeedsAssessor)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
          assessmentId: scenario.users.johnInnovator.innovations.johnInnovation.assessment.id
        })
        .setBody<BodyType>({ assessorId })
        .call<ResponseDTO>(v1InnovationAssessmentAssessorUpdate);

      expect(result.status).toBe(403);
    });
  });
});
