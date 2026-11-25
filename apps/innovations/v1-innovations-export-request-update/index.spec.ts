import azureFunction from '.';

import { InnovationExportRequestStatusEnum } from '@innovations/shared/enums';
import { AzureHttpTriggerBuilder, TestsHelper } from '@innovations/shared/tests';
import type { TestUserType } from '@innovations/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@innovations/shared/types';
import { randText, randUuid } from '@ngneat/falso';
import { InnovationExportRequestService } from '../_services/innovation-export-request.service';
import type { BodyType, ParamsType } from './validation.schemas';

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

const mock = jest.spyOn(InnovationExportRequestService.prototype, 'updateExportRequest').mockResolvedValue();

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-innovation-export-request-update Suite', () => {
  describe('200', () => {
    it('should update an export request', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.aliceQualifyingAccessor)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
          requestId: randUuid()
        })
        .setBody<BodyType>({ status: InnovationExportRequestStatusEnum.CANCELLED })
        .call<never>(azureFunction);

      expect(result.body).toBeUndefined();
      expect(result.status).toBe(204);
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });

  // TODO maybe validate joi schema since it changes according to user type. Currently we aren't validating the schema

  describe('Access', () => {
    it.each([
      ['Admin', 403, scenario.users.allMighty],
      ['QA', 204, scenario.users.aliceQualifyingAccessor],
      ['A', 204, scenario.users.ingridAccessor],
      ['NA', 204, scenario.users.paulNeedsAssessor],
      ['Innovator owner', 204, scenario.users.johnInnovator],
      ['Innovator collaborator', 204, scenario.users.janeInnovator],
      ['Innovator other', 403, scenario.users.ottoOctaviusInnovator]
    ])('access with user %s should give %i', async (role: string, status: number, user: TestUserType) => {
      const innovator = role.includes('Innovator');
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
          requestId: randUuid()
        })
        .setBody<BodyType>(
          innovator
            ? { status: InnovationExportRequestStatusEnum.REJECTED, rejectReason: randText() }
            : { status: InnovationExportRequestStatusEnum.CANCELLED }
        )
        .call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(status);
    });
  });
});
