import { InnovationTaskStatusEnum } from '@innovations/shared/enums';
import { AzureHttpTriggerBuilder, TestsHelper } from '@innovations/shared/tests';
import type { TestUserType } from '@innovations/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@innovations/shared/types';
import { randText, randUuid } from '@ngneat/falso';
import { default as v1InnovationTaskUpdate } from '.';
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
const updateTaskAccessor = jest
  .spyOn(InnovationTasksService.prototype, 'updateTaskAsAccessor')
  .mockResolvedValue(expected);
const updateTaskNA = jest
  .spyOn(InnovationTasksService.prototype, 'updateTaskAsNeedsAccessor')
  .mockResolvedValue(expected);
const updateTaskInnovator = jest
  .spyOn(InnovationTasksService.prototype, 'updateTaskAsInnovator')
  .mockResolvedValue(expected);
const mocks = [updateTaskAccessor, updateTaskNA, updateTaskInnovator];

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-innovation-task-update Suite', () => {
  describe('200', () => {
    it.each([
      ['ACCESSOR', scenario.users.ingridAccessor, updateTaskAccessor],
      ['QUALIFYING_ACCESSOR', scenario.users.aliceQualifyingAccessor, updateTaskAccessor],
      ['NEEDS_ASSESSOR', scenario.users.paulNeedsAssessor, updateTaskNA],
      ['INNOVATOR', scenario.users.johnInnovator, updateTaskInnovator]
    ])('should update an task as %s', async (_label, user, mock) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
          taskId: randUuid()
        })
        .setBody<BodyType>({ status: InnovationTaskStatusEnum.OPEN, message: randText() })
        .call<ResponseDTO>(v1InnovationTaskUpdate);

      expect(result.body).toMatchObject(expected);
      expect(result.status).toBe(200);
      expect(mock).toHaveBeenCalledTimes(1);
      for (const otherMock of mocks.filter(m => m !== mock)) {
        expect(otherMock).toHaveBeenCalledTimes(0);
      }
    });
  });

  describe('Access', () => {
    it.each([
      ['Admin', 403, scenario.users.allMighty],
      ['QA', 200, scenario.users.aliceQualifyingAccessor],
      ['NA', 200, scenario.users.paulNeedsAssessor],
      ['Innovator', 200, scenario.users.johnInnovator]
    ])('access with user %s should give %i', async (_role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
          taskId: randUuid()
        })
        .setBody<BodyType>({ status: InnovationTaskStatusEnum.OPEN, message: randText() })
        .call<ErrorResponseType>(v1InnovationTaskUpdate);

      expect(result.status).toBe(status);
    });
  });
});
