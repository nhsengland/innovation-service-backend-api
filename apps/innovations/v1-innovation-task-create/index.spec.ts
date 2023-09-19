import { GenericErrorsEnum } from '@innovations/shared/errors';
import { AzureHttpTriggerBuilder, TestsHelper } from '@innovations/shared/tests';
import type { TestUserType } from '@innovations/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@innovations/shared/types';
import { randText, randUuid } from '@ngneat/falso';
import v1InnovationTaskCreate from '.';
import { InnovationTasksService } from '../_services/innovation-tasks.service';
import type { ResponseDTO } from './transformation.dtos';
import type { BodyType, ParamsType } from './validation.schemas';

jest.mock('@innovations/shared/decorators', () => ({
  JwtDecoder: jest.fn().mockImplementation(() => (_: any, __: string, descriptor: PropertyDescriptor) => {
    return descriptor;
  })
}));

const testsHelper = new TestsHelper();
const scenario = testsHelper.getCompleteScenario();

beforeAll(async () => {
  await testsHelper.init();
});

const expected = { id: randUuid() };
const createTaskSpy = jest.spyOn(InnovationTasksService.prototype, 'createTask').mockResolvedValue(expected);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-innovation-task-create Suite', () => {
  const payload = { section: 'INNOVATION_DESCRIPTION' as const, description: randText() };

  describe('200', () => {
    it('should create an task', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.aliceQualifyingAccessor)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id
        })
        .setBody<BodyType>(payload)
        .call<ResponseDTO>(v1InnovationTaskCreate);

      expect(result.body).toMatchObject(expected);
      expect(result.status).toBe(200);
      expect(createTaskSpy).toHaveBeenCalledTimes(1);
    });
  });

  // POC: maybe improve tests in the future by including the validation schemas
  describe('400', () => {
    it.each(['section', 'description'] as const)('should fail if missing mandatory parameter %s', async parameter => {
      const body = { ...payload };
      delete body[parameter];
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.janeInnovator)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id
        })
        .setBody<BodyType>(parameter as any)
        .call<ErrorResponseType>(v1InnovationTaskCreate);

      expect(result.body.error).toMatch(GenericErrorsEnum.INVALID_PAYLOAD);
      expect(result.body.message).toMatch('Invalid request');
      expect(result.status).toBe(400);
    });
  });

  describe('Access', () => {
    it.each([
      ['Admin', 403, scenario.users.allMighty],
      ['QA', 200, scenario.users.aliceQualifyingAccessor],
      ['NA', 200, scenario.users.paulNeedsAssessor],
      ['Innovator', 403, scenario.users.johnInnovator]
    ])('access with user %s should give %i', async (_role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id
        })
        .setBody<BodyType>(payload)
        .call<ErrorResponseType>(v1InnovationTaskCreate);

      expect(result.status).toBe(status);
    });
  });
});
