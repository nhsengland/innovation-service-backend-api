import azureFunction from '.';

import { AzureHttpTriggerBuilder, TestsHelper } from '@innovations/shared/tests';
import type { TestUserType } from '@innovations/shared/tests/builders/user.builder';
import { randPastDate, randText, randUserName, randUuid } from '@ngneat/falso';
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

const expected = {
  id: randUuid(),
  // reassessment?: { updatedInnovationRecord: CurrentCatalogTypes.catalogYesNo; description: string },
  summary: randText(),
  description: randText(),
  startedAt: randPastDate(),
  finishedAt: randPastDate(),
  assignTo: { id: randUuid(), name: randUserName() },
  maturityLevel: 'READY' as const,
  maturityLevelComment: randText(),
  hasRegulatoryApprovals: 'YES' as const,
  hasRegulatoryApprovalsComment: randText(),
  hasEvidence: 'YES' as const,
  hasEvidenceComment: randText(),
  hasValidation: 'YES' as const,
  hasValidationComment: randText(),
  hasProposition: 'YES' as const,
  hasPropositionComment: randText(),
  hasCompetitionKnowledge: 'YES' as const,
  hasCompetitionKnowledgeComment: randText(),
  hasImplementationPlan: 'YES' as const,
  hasImplementationPlanComment: randText(),
  hasScaleResource: 'YES' as const,
  hasScaleResourceComment: randText(),
  suggestedOrganisations: [
    {
      id: randUuid(),
      name: randText(),
      acronym: randText(),
      units: []
    }
  ],
  updatedAt: randPastDate(),
  updatedBy: { id: randUuid(), name: randUserName() },
  isLatest: true
};
const mock = jest
  .spyOn(InnovationAssessmentsService.prototype, 'getInnovationAssessmentInfo')
  .mockResolvedValue(expected);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-innovation-assessment-info', () => {
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

    it('should return success with reassessment', async () => {
      const expectedWithReassessment = {
        ...expected,
        reassessment: {
          reassessmentReason: [],
          description: randText(),
          whatSupportDoYouNeed: randText(),
          previousAssessmentId: randUuid(),
          sectionsUpdatedSinceLastAssessment: []
        }
      };
      mock.mockResolvedValueOnce(expectedWithReassessment);
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.paulNeedsAssessor)
        .setParams<ParamsType>({ innovationId, assessmentId })
        .call<ResponseDTO>(azureFunction);
      expect(result.body).toStrictEqual(expectedWithReassessment);
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
