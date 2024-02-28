import azureFunction from '.';

import { AzureHttpTriggerBuilder, TestsHelper } from '@innovations/shared/tests';
import type { TestUserType } from '@innovations/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@innovations/shared/types';
import { randText } from '@ngneat/falso';
import { InnovationSupportsService } from '../_services/innovation-supports.service';
import type { BodyType, ParamsType } from './validation.schemas';
import { GenericErrorsEnum } from '@innovations/shared/errors';

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

const mock = jest.spyOn(InnovationSupportsService.prototype, 'createProgressUpdate').mockResolvedValue();

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-innovation-support-summary-progress-create', () => {
  const innovationId = scenario.users.johnInnovator.innovations.johnInnovation.id;
  describe('201', () => {
    it.each([
      ['simple', { title: randText() }],
      ['one level', { categories: [randText()] }],
      ['two level', { category: randText(), subCategories: [randText()] }]
    ])('should create an innovation %s support summary progress', async (_type, params) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.aliceQualifyingAccessor)
        .setParams<ParamsType>({ innovationId })
        .setBody<BodyType>({ description: randText(), params })
        .call<never>(azureFunction);

      expect(result.status).toBe(201);
      expect(result.body).toBeUndefined();
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('400', () => {
    it('should return a error when the params are invalid', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.aliceQualifyingAccessor)
        .setParams<ParamsType>({ innovationId })
        .setBody<BodyType>({ description: randText(), params: {} as any })
        .call<ErrorResponseType>(azureFunction);

      expect(result.body).toMatchObject({ error: GenericErrorsEnum.INVALID_PAYLOAD, message: 'Invalid request' });
      expect(result.status).toBe(400);
    });
  });

  describe('Access', () => {
    it.each([
      ['Admin', 403, scenario.users.allMighty],
      ['QA', 201, scenario.users.aliceQualifyingAccessor],
      ['NA', 403, scenario.users.paulNeedsAssessor],
      ['Innovator owner', 403, scenario.users.johnInnovator],
      ['Innovator collaborator', 403, scenario.users.janeInnovator],
      ['Innovator other', 403, scenario.users.ottoOctaviusInnovator]
    ])('access with user %s should give %i', async (_role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setParams<ParamsType>({ innovationId })
        .setBody<BodyType>({
          description: randText(),
          params: { title: randText() }
        })
        .call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(status);
    });

    it.each([
      ['QA', scenario.users.aliceQualifyingAccessor, undefined],
      ['A', scenario.users.jamieMadroxAccessor, 'healthAccessorRole']
    ])(
      'access with user %s should give conflict in the archive',
      async (_role: string, user: TestUserType, roleKey?: string) => {
        const result = await new AzureHttpTriggerBuilder()
          .setAuth(user, roleKey)
          .setParams<ParamsType>({
            innovationId: scenario.users.johnInnovator.innovations.johnInnovationArchived.id
          })
          .setBody<BodyType>({ description: randText(), params: { title: randText() } })
          .call<ErrorResponseType>(azureFunction);

        expect(result.status).toBe(409);
      }
    );
  });
});
