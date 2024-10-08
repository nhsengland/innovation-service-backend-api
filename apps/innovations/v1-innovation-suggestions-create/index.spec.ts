import azureFunction from '.';

import { AzureHttpTriggerBuilder, TestsHelper } from '@innovations/shared/tests';
import type { TestUserType } from '@innovations/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@innovations/shared/types';
import { randText } from '@ngneat/falso';
import { InnovationSupportsService } from '../_services/innovation-supports.service';
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

const mock = jest
  .spyOn(InnovationSupportsService.prototype, 'createInnovationOrganisationsSuggestions')
  .mockResolvedValue();

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-innovation-suggestion-create Suite', () => {
  describe('201', () => {
    it('should create an innovation suggestion', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.aliceQualifyingAccessor)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id
        })
        .setBody<BodyType>({
          description: randText(),
          organisationUnits: [scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id]
        })
        .call<never>(azureFunction);

      expect(result.status).toBe(201);
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Access', () => {
    it.each([
      ['Admin', 403, scenario.users.allMighty],
      ['QA', 201, scenario.users.aliceQualifyingAccessor],
      ['A', 403, scenario.users.ingridAccessor],
      ['NA', 403, scenario.users.paulNeedsAssessor],
      ['Innovator owner', 403, scenario.users.johnInnovator],
      ['Innovator collaborator', 403, scenario.users.janeInnovator],
      ['Innovator other', 403, scenario.users.ottoOctaviusInnovator]
    ])('access with user %s should give %i', async (_role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id
        })
        .setBody<BodyType>({
          description: randText(),
          organisationUnits: [scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id]
        })
        .call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(status);
    });
  });

  it.each([['QA', scenario.users.aliceQualifyingAccessor, undefined]])(
    'access with user %s should give conflict in the archive',
    async (_role: string, user: TestUserType, roleKey?: string) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user, roleKey)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovationArchived.id
        })
        .setBody<BodyType>({
          description: randText(),
          organisationUnits: [scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id]
        })
        .call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(409);
    }
  );
});
