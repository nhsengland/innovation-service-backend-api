import { ActivityEnum, ActivityTypeEnum } from '@innovations/shared/enums';
import { AzureHttpTriggerBuilder, TestsHelper } from '@innovations/shared/tests';
import type { TestUserType } from '@innovations/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@innovations/shared/types';
import { randUserName } from '@ngneat/falso';
import v1InnovationActivitiesLogList from '.';
import { InnovationsService } from '../_services/innovations.service';
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

const expected = {
  count: 2,
  data: [
    {
      type: ActivityTypeEnum.TASKS,
      activity: ActivityEnum.TASK_CREATION,
      date: new Date(),
      params: { taskUserName: randUserName() }
    },
    {
      type: ActivityTypeEnum.TASKS,
      activity: ActivityEnum.TASK_CREATION,
      date: new Date(),
      params: { taskUserName: randUserName() }
    }
  ]
};
const mock = jest.spyOn(InnovationsService.prototype, 'getInnovationActivitiesLog').mockResolvedValue(expected);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-innovation-activities-log-list Suite', () => {
  describe('200', () => {
    it('should return the activities log list', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.aliceQualifyingAccessor)
        .setParams<ParamsType>({ innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id })
        .call<ResponseDTO>(v1InnovationActivitiesLogList);

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
        .setParams<ParamsType>({ innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id })
        .call<ResponseDTO>(v1InnovationActivitiesLogList);

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
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setParams<ParamsType>({ innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id })
        .call<ErrorResponseType>(v1InnovationActivitiesLogList);

      expect(result.status).toBe(status);
    });
  });
});
