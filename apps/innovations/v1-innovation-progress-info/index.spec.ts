import azureFunction from '.';

import { AzureHttpTriggerBuilder, TestsHelper } from '@innovations/shared/tests';
import type { TestUserType } from '@innovations/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@innovations/shared/types';
import { randNumber } from '@ngneat/falso';
import { InnovationsService } from '../_services/innovations.service';
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

const expected: Awaited<ReturnType<InnovationsService['getInnovationProgress']>> = {
  deploymentCount: randNumber(),
  ukcaceCertification: 'YES',
  dtacCertification: 'YES',
  evidenceClinicalOrCare: 'YES',
  evidenceRealWorld: 'YES',
  assessmentRealWorldValidation: 'YES',
  evidenceOfImpact: 'YES',
  assessmentEvidenceProveEfficacy: 'YES',
  evidenceCostImpact: 'YES',
  workingProduct: 'YES',
  carbonReductionPlan: 'YES',
  htwTerComplete: 'YES',
  niceGuidanceComplete: 'YES',
  scProcurementRouteIdentified: 'YES'
};
const mock = jest.spyOn(InnovationsService.prototype, 'getInnovationProgress').mockResolvedValue(expected);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-innovation-progress-info Suite', () => {
  describe('200', () => {
    it('should return the innovation progress', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.aliceQualifyingAccessor)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id
        })
        .call<ResponseDTO>(azureFunction);

      expect(result.body).toStrictEqual(expected);
      expect(result.status).toBe(200);
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Access', () => {
    it.each([
      ['Admin', 200, scenario.users.allMighty],
      ['QA', 200, scenario.users.aliceQualifyingAccessor],
      ['NA', 200, scenario.users.paulNeedsAssessor],
      ['Innovator owner', 403, scenario.users.johnInnovator]
    ])('access with user %s should give %i', async (_role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id
        })
        .call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(status);
    });
  });
});
