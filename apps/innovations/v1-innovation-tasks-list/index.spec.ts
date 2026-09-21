import { InnovationTaskStatusEnum } from '@innovations/shared/enums';
import { AzureHttpTriggerBuilder, TestsHelper } from '@innovations/shared/tests';
import type { TestUserType } from '@innovations/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@innovations/shared/types';
import { randFullName, randNumber, randText, randUuid } from '@ngneat/falso';
import v1InnovationTasksList from '.';
import { InnovationTasksService } from '../_services/innovation-tasks.service';
import type { ResponseDTO } from './transformation.dtos';

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

const expected = {
  count: 2,
  data: [
    {
      id: randUuid(),
      displayId: randText(),
      innovation: { id: randText(), name: randText() },
      status: InnovationTaskStatusEnum.DONE,
      section: 'INNOVATION_DESCRIPTION' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      updatedBy: { name: randFullName(), displayTag: randText() },
      createdBy: { name: randFullName(), displayTag: randText() },
      assignedTo: { name: randFullName(), displayTag: randText() },
      notifications: randNumber(),
      sameOrganisation: true
    },
    {
      id: randUuid(),
      displayId: randText(),
      innovation: { id: randText(), name: randText() },
      status: InnovationTaskStatusEnum.DONE,
      section: 'INNOVATION_DESCRIPTION' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      updatedBy: { name: randFullName(), displayTag: randText() },
      createdBy: { name: randFullName(), displayTag: randText() },
      assignedTo: { name: randFullName(), displayTag: randText() },
      sameOrganisation: true
    }
  ]
};
const mock = jest.spyOn(InnovationTasksService.prototype, 'getTasksList').mockResolvedValue(expected);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-innovation-task-list Suite', () => {
  describe('200', () => {
    it('should return the tasks list', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.aliceQualifyingAccessor)
        .call<ResponseDTO>(v1InnovationTasksList);

      expect(result.body).toMatchObject(expected);
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
        .call<ResponseDTO>(v1InnovationTasksList);

      expect(result.status).toBe(500);
      expect(result.body).toMatchObject({ message: 'Unknown error.' });
    });
  });

  describe('Access', () => {
    it.each([
      ['Admin', 200, scenario.users.allMighty],
      ['QA', 200, scenario.users.aliceQualifyingAccessor],
      ['NA', 200, scenario.users.paulNeedsAssessor],
      ['Innovator', 200, scenario.users.johnInnovator]
    ])('access with user %s should give %i', async (_role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder().setAuth(user).call<ErrorResponseType>(v1InnovationTasksList);

      expect(result.status).toBe(status);
    });
  });
});
