import { StatisticsHandlersHelper } from './handlers.helper';

import { randNumber, randPastDate } from '@ngneat/falso';
import { TestsHelper } from '@users/shared/tests';
import { DTOsHelper } from '@users/shared/tests/helpers/dtos.helper';
import { UserStatisticsEnum } from '../_enums/user.enums';
import { StatisticsService } from '../_services/statistics.service';

describe('Handlers Helper Suite', () => {
  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  afterEach(() => {
    jest.clearAllMocks();
  });

  const tasksOpen = {
    OPEN: 1,
    DECLINED: 3,
    DONE: 5,
    lastUpdatedAt: randPastDate()
  };
  const actionsToReviewMock = jest.spyOn(StatisticsService.prototype, 'getTasksCounter').mockResolvedValue(tasksOpen);
  const assignedInnovations = {
    count: randNumber(),
    total: randNumber(),
    overdue: randNumber()
  };
  const assignedInnovationsMock = jest
    .spyOn(StatisticsService.prototype, 'assignedInnovations')
    .mockResolvedValue(assignedInnovations);

  describe('runHandler', () => {
    it('should call one handler', async () => {
      const res = await StatisticsHandlersHelper.runHandler(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        [UserStatisticsEnum.TASKS_RESPONDED_COUNTER]
      );
      expect(actionsToReviewMock).toBeCalledTimes(1);
      expect(assignedInnovationsMock).toBeCalledTimes(0);
      expect(res).toStrictEqual({
        TASKS_RESPONDED_COUNTER: {
          count: 8,
          total: 9,
          lastSubmittedAt: tasksOpen.lastUpdatedAt
        }
      });
    });

    it('should handle multiple handlers', async () => {
      const res = await StatisticsHandlersHelper.runHandler(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        [UserStatisticsEnum.TASKS_RESPONDED_COUNTER, UserStatisticsEnum.ASSIGNED_INNOVATIONS_COUNTER]
      );
      expect(actionsToReviewMock).toBeCalledTimes(1);
      expect(assignedInnovationsMock).toBeCalledTimes(1);
      expect(res).toStrictEqual({
        TASKS_RESPONDED_COUNTER: {
          count: 8,
          total: 9,
          lastSubmittedAt: tasksOpen.lastUpdatedAt
        },
        ASSIGNED_INNOVATIONS_COUNTER: assignedInnovations
      });
    });
  });
});
