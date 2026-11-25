import azureFunction from '.';

import { InnovationArchiveReasonEnum } from '@innovations/shared/enums';
import { AzureHttpTriggerBuilder, TestsHelper } from '@innovations/shared/tests';
import type { TestUserType } from '@innovations/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@innovations/shared/types';
import { InnovationsService } from '../_services/innovations.service';
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

const mock = jest.spyOn(InnovationsService.prototype, 'archiveInnovation').mockResolvedValue();

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-innovation-archive Suite', () => {
  const innovationId = scenario.users.johnInnovator.innovations.johnInnovation.id;

  describe('204', () => {
    it('should archive the innovation', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .setParams<ParamsType>({ innovationId })
        .setBody<BodyType>({ reason: InnovationArchiveReasonEnum.ALREADY_LIVE_NHS })
        .call<never>(azureFunction);

      expect(result.body).toBeUndefined();
      expect(result.status).toBe(204);
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Access', () => {
    it.each([
      ['Admin', 403, scenario.users.allMighty],
      ['QA', 403, scenario.users.aliceQualifyingAccessor],
      ['NA', 403, scenario.users.paulNeedsAssessor],
      ['Innovator owner', 204, scenario.users.johnInnovator],
      ['Innovator collaborator', 403, scenario.users.janeInnovator],
      ['Innovator other', 403, scenario.users.ottoOctaviusInnovator]
    ])('access with user %s should give %i', async (_role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setParams<ParamsType>({ innovationId })
        .setBody<BodyType>({ reason: InnovationArchiveReasonEnum.ALREADY_LIVE_NHS })
        .call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(status);
    });
  });
});
