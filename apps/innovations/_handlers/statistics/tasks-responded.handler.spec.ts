import { TasksRespondedStatisticsHandler } from './tasks-responded.handler';

import { InnovationTaskStatusEnum } from '@innovations/shared/enums';
import { TestsHelper } from '@innovations/shared/tests';
import { DTOsHelper } from '@innovations/shared/tests/helpers/dtos.helper';
import { randPastDate, randUuid } from '@ngneat/falso';
import { StatisticsService } from '../../_services/statistics.service';

describe('Actions To Submit Statistics Handler Suite', () => {
  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await testsHelper.init();
  });

  const expected = {
    [InnovationTaskStatusEnum.DONE]: 3,
    [InnovationTaskStatusEnum.CANCELLED]: 2,
    [InnovationTaskStatusEnum.OPEN]: 1,
    lastUpdatedAt: randPastDate()
  };
  const mock = jest.spyOn(StatisticsService.prototype, 'getTasksCounter').mockResolvedValue(expected);

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('run', () => {
    it('should return the statistic', async () => {
      const handler = new TasksRespondedStatisticsHandler(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        { innovationId: randUuid() }
      );
      const res = await handler.run();
      expect(res).toStrictEqual({
        count: 3 + 2,
        total: 3 + 2 + 1,
        lastSubmittedAt: expected.lastUpdatedAt
      });
      expect(mock).toBeCalledTimes(1);
    });
  });
});
