import azureFunction from '.';

import { AzureHttpTriggerBuilder, TestsHelper } from '@innovations/shared/tests';
import type { TestUserType } from '@innovations/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@innovations/shared/types';
import type { ResponseDTO } from './transformation.dtos';
import { IRSchemaService } from '@innovations/shared/services';
import { SchemaModel } from '@innovations/shared/models';

jest.mock('@innovations/shared/decorators', () => ({
  JwtDecoder: jest.fn().mockImplementation(() => (_: any, __: string, descriptor: PropertyDescriptor) => descriptor),
  Audit: jest.fn().mockImplementation(() => (_: any, __: string, descriptor: PropertyDescriptor) => descriptor)
}));

const testsHelper = new TestsHelper();
const scenario = testsHelper.getCompleteScenario();

beforeAll(async () => {
  await testsHelper.init();
});

const model = new SchemaModel([
  { id: 'id1', title: 'Section 1', subSections: [] },
  { id: 'id2', title: 'Section 2', subSections: [] }
]);
model.runRules();
const expected = { version: 1, model };
const mock = jest.spyOn(IRSchemaService.prototype, 'getSchema').mockResolvedValue(expected as any);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-innovations-search Suite', () => {
  describe('200', () => {
    it('should return the innovations', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.aliceQualifyingAccessor)
        .call<ResponseDTO>(azureFunction);

      expect(result.body).toStrictEqual({ version: expected.version, schema: expected.model.schema });
      expect(result.status).toBe(200);
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Access', () => {
    it.each([
      ['Admin', 200, scenario.users.allMighty],
      ['QA', 200, scenario.users.aliceQualifyingAccessor],
      ['A', 200, scenario.users.ingridAccessor],
      ['NA', 200, scenario.users.paulNeedsAssessor],
      ['Innovator owner', 200, scenario.users.johnInnovator],
      ['Innovator collaborator', 200, scenario.users.janeInnovator]
    ])('access with user %s should give %i', async (_role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder().setAuth(user).call<ErrorResponseType>(azureFunction);
      expect(result.status).toBe(status);
    });
  });
});
