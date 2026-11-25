import v1InnovationTaskInfo from '.';

import { InnovationTaskStatusEnum } from '@innovations/shared/enums';
import { GenericErrorsEnum } from '@innovations/shared/errors';
import { AzureHttpTriggerBuilder, TestsHelper } from '@innovations/shared/tests';
import type { TestUserType } from '@innovations/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@innovations/shared/types';
import { randomUUID } from 'crypto';
import { InnovationTasksService } from '../_services/innovation-tasks.service';
import type { ResponseDTO } from './transformation.dtos';
import type { ParamsType } from './validation.schemas';

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

const exampleTask = {
  id: randomUUID(),
  displayId: 'UC01',
  status: InnovationTaskStatusEnum.DONE,
  section: 'INNOVATION_DESCRIPTION' as const,
  descriptions: [
    {
      description: 'description 1',
      createdAt: new Date(),
      name: 'name 1',
      displayTag: 'orgUnit1'
    }
  ],
  sameOrganisation: true,
  threadId: randomUUID(),
  createdAt: new Date(),
  updatedAt: new Date(),
  updatedBy: { name: 'name 1', displayTag: 'NHS Innovation Service' },
  createdBy: { name: 'name 1', displayTag: 'NHS Innovation Service' },
  assignedTo: { name: 'name 1', displayTag: 'NHS Innovation Service' }
};
const mock = jest.spyOn(InnovationTasksService.prototype, 'getTaskInfo').mockResolvedValue(exampleTask);

afterEach(() => {
  mock.mockClear();
});

describe('v1-innovation-task-info Suite', () => {
  describe('200', () => {
    it('should return an task', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
          taskId: exampleTask.id
        })
        .call<ResponseDTO>(v1InnovationTaskInfo);

      expect(result.body).toMatchObject(exampleTask);
      expect(result.status).toBe(200);
    });
  });

  describe('400', () => {
    it('should return error when no required params are passed', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .setParams<any>({})
        .call<ErrorResponseType>(v1InnovationTaskInfo);

      expect(result.body).toMatchObject({
        error: GenericErrorsEnum.INVALID_PAYLOAD,
        message: 'Invalid request'
      });
      expect(result.status).toBe(400);
    });

    it('should return error when innovationId param is not passed', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .setParams<any>({ taskId: randomUUID() })
        .call<ErrorResponseType>(v1InnovationTaskInfo);

      expect(result.body).toMatchObject({
        error: GenericErrorsEnum.INVALID_PAYLOAD,
        message: 'Invalid request',
        details: [
          {
            context: {},
            key: 'innovationId',
            message: '"innovationId" is required',
            type: 'any.required'
          }
        ]
      });
      expect(result.status).toBe(400);
    });

    it('should return error when taskId param is not passed', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .setParams<any>({ innovationId: randomUUID() })
        .call<ErrorResponseType>(v1InnovationTaskInfo);

      expect(result.body).toMatchObject({
        error: GenericErrorsEnum.INVALID_PAYLOAD,
        message: 'Invalid request',
        details: [
          {
            context: {},
            key: 'taskId',
            message: '"taskId" is required',
            type: 'any.required'
          }
        ]
      });
      expect(result.status).toBe(400);
    });
  });

  describe('Access', () => {
    it.each([
      ['Admin', 200, scenario.users.allMighty],
      ['QA', 200, scenario.users.aliceQualifyingAccessor],
      ['NA', 200, scenario.users.paulNeedsAssessor],
      ['Innovator', 200, scenario.users.johnInnovator]
    ])('access with user %s should give %i', async (_role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
          taskId: exampleTask.id
        })
        .call<ResponseDTO>(v1InnovationTaskInfo);

      expect(result.status).toBe(status);
    });
  });
});
