import azureFunction from '.';

import { InnovationCollaboratorStatusEnum } from '@innovations/shared/enums';
import { AzureHttpTriggerBuilder, TestsHelper } from '@innovations/shared/tests';
import { randUuid } from '@ngneat/falso';
import { InnovationCollaboratorsService } from '../_services/innovation-collaborators.service';
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

const expected = { userExists: true, collaboratorStatus: InnovationCollaboratorStatusEnum.ACTIVE };
const mock = jest.spyOn(InnovationCollaboratorsService.prototype, 'checkCollaborator').mockResolvedValue(expected);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-innovation-assessment-assessor-update Suite', () => {
  describe('200', () => {
    it('should return success', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.paulNeedsAssessor)
        .setParams<ParamsType>({ collaboratorId: randUuid() })
        .call<ResponseDTO>(azureFunction);

      expect(result.body).toStrictEqual(expected);
      expect(result.status).toBe(200);
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('500', () => {
    // Require to test the error handler since access is successful for all
    it('should return 500 when an unepected error occurs', async () => {
      mock.mockRejectedValueOnce(new Error('test error'));
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.aliceQualifyingAccessor)
        .setParams<ParamsType>({ collaboratorId: randUuid() })
        .call<ResponseDTO>(azureFunction);

      expect(result.status).toBe(500);
      expect(result.body).toMatchObject({ message: 'Unknown error.' });
    });
  });
});
