import azureFunction from '.';

import { InnovationFileContextTypeEnum } from '@innovations/shared/enums';
import { AzureHttpTriggerBuilder, TestsHelper } from '@innovations/shared/tests';
import type { TestUserType } from '@innovations/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@innovations/shared/types';
import { randFileName, randNumber, randText, randUuid } from '@ngneat/falso';
import { InnovationFileService } from '../_services/innovation-file.service';
import type { ResponseDTO } from './transformation.dtos';
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

const sampleBody = {
  context: { id: randUuid(), type: InnovationFileContextTypeEnum.INNOVATION },
  name: randFileName(),
  description: randText(),
  file: {
    id: randUuid(),
    name: randFileName(),
    size: randNumber(),
    extension: 'pdf'
  }
};
const expected = { id: randUuid() };
const mock = jest.spyOn(InnovationFileService.prototype, 'createFile').mockResolvedValue(expected);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-innovation-file-create Suite', () => {
  describe('200', () => {
    it('should create a file', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .setParams<ParamsType>({ innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id })
        .setBody<BodyType>(sampleBody)
        .call<ResponseDTO>(azureFunction);

      expect(result.body).toMatchObject(expected);
      expect(result.status).toBe(200);
      expect(mock).toHaveBeenCalledTimes(1);
    });

    it('should create a file as innovator for archived innovations', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .setParams<ParamsType>({ innovationId: scenario.users.johnInnovator.innovations.johnInnovationArchived.id })
        .setBody<BodyType>(sampleBody)
        .call<ResponseDTO>(azureFunction);

      expect(result.body).toMatchObject(expected);
      expect(result.status).toBe(200);
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('409', () => {
    it.each([['QA', scenario.users.aliceQualifyingAccessor, undefined]])(
      'access with user %s should give conflict in the archive',
      async (_role: string, user: TestUserType, roleKey?: string) => {
        const result = await new AzureHttpTriggerBuilder()
          .setAuth(user, roleKey)
          .setParams<ParamsType>({ innovationId: scenario.users.johnInnovator.innovations.johnInnovationArchived.id })
          .setBody<BodyType>(sampleBody)
          .call<ResponseDTO>(azureFunction);

        expect(result.status).toBe(409);
      }
    );
  });

  describe('Access', () => {
    it.each([
      ['Admin', 403, scenario.users.allMighty],
      ['QA', 200, scenario.users.aliceQualifyingAccessor],
      ['NA', 200, scenario.users.paulNeedsAssessor],
      ['Innovator owner', 200, scenario.users.johnInnovator],
      ['Innovator other', 403, scenario.users.ottoOctaviusInnovator]
    ])('access with user %s should give %i', async (_role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setParams<ParamsType>({ innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id })
        .setBody<BodyType>(sampleBody)
        .call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(status);
    });
  });
});
