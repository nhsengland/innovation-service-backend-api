import azureFunction from '.';

import { AzureHttpTriggerBuilder, TestsHelper } from '@innovations/shared/tests';
import type { TestUserType } from '@innovations/shared/tests/builders/user.builder';
import { randText, randUuid } from '@ngneat/falso';
import type { ParamsType } from './validation.schemas';
import { SurveysService } from '../_services/surveys.service';

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

const body = {
  comment: randText(),
  ideaOnHowToProceed: 'YES',
  supportSatisfaction: '1',
  howLikelyWouldYouRecommendIS: '10'
};
const mock = jest.spyOn(SurveysService.prototype, 'answerSurvey').mockResolvedValue();

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-innovation-survey-answer Suite', () => {
  describe('204', () => {
    it('should answer the survey', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
          surveyId: randUuid()
        })
        .setBody(body)
        .call<never>(azureFunction);

      expect(result.status).toBe(204);
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Access', () => {
    it.each([
      ['Admin', 403, scenario.users.allMighty],
      ['QA', 403, scenario.users.aliceQualifyingAccessor],
      ['A', 403, scenario.users.ingridAccessor],
      ['NA', 403, scenario.users.paulNeedsAssessor],
      ['Innovator owner', 204, scenario.users.johnInnovator],
      ['Innovator collaborator', 204, scenario.users.janeInnovator],
      ['Innovator other', 403, scenario.users.ottoOctaviusInnovator]
    ])('access with user %s should give %i', async (_role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
          surveyId: randUuid()
        })
        .setBody(body)
        .call<never>(azureFunction);

      expect(result.status).toBe(status);
    });
  });
});
