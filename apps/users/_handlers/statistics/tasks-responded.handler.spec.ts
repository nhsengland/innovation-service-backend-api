import { tasksRespondedStatisticsHandler } from './tasks-responded.handler';

import { randPastDate } from '@ngneat/falso';
import { TestsHelper } from '@users/shared/tests';
import { DTOsHelper } from '@users/shared/tests/helpers/dtos.helper';
import { StatisticsService } from '../../_services/statistics.service';

describe('Actions To Review Statistics Handler Suite', () => {
  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();
  const expected = {
    OPEN: 5,
    DONE: 1,
    DECLINED: 3,
    lastUpdatedAt: randPastDate()
  };
  const mock = jest.spyOn(StatisticsService.prototype, 'getTasksCounter').mockResolvedValue(expected);

  it('should return statistics', async () => {
    const res = await tasksRespondedStatisticsHandler(
      DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor)
    );
    expect(res).toStrictEqual({
      count: expected.DONE + expected.DECLINED,
      total: expected.OPEN + expected.DONE + expected.DECLINED,
      lastSubmittedAt: new Date(expected.lastUpdatedAt)
    });
    expect(mock).toBeCalledTimes(1);
  });
});
