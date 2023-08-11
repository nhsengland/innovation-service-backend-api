import { actionsToReviewStatisticsHandler } from './actions-to-review.handler';

import { randNumber, randPastDate } from '@ngneat/falso';
import { TestsHelper } from '@users/shared/tests';
import { DTOsHelper } from '@users/shared/tests/helpers/dtos.helper';
import { StatisticsService } from '../../_services/statistics.service';

describe('Actions To Review Statistics Handler Suite', () => {
  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();
  const expected = {
    count: randNumber(),
    total: randNumber(),
    lastSubmittedAt: randPastDate()
  };
  const mock = jest.spyOn(StatisticsService.prototype, 'actionsToReview').mockResolvedValue(expected);

  it('should return statistics', async () => {
    const res = await actionsToReviewStatisticsHandler(
      DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor)
    );
    expect(res).toStrictEqual(expected);
    expect(mock).toBeCalledTimes(1);
  });
});
