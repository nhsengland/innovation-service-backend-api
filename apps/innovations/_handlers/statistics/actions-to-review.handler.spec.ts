import { ActionsToReviewStatisticsHandler } from './actions-to-review.handler';

import { TestsHelper } from '@innovations/shared/tests';
import { DTOsHelper } from '@innovations/shared/tests/helpers/dtos.helper';
import { randNumber, randPastDate, randText, randUuid } from '@ngneat/falso';
import { StatisticsService } from '../../_services/statistics.service';

describe('Actions To Review Statistics Handler Suite', () => {
  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await testsHelper.init();
  });

  const expected = {
    count: randNumber(),
    lastSubmittedSection: randText(),
    lastSubmittedAt: randPastDate()
  };
  const mock = jest.spyOn(StatisticsService.prototype, 'actionsToReview').mockResolvedValue(expected);

  describe('run', () => {
    it('should return the statistic', async () => {
      const handler = new ActionsToReviewStatisticsHandler(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        { innovationId: randUuid() }
      );
      const res = await handler.run();
      expect(res).toStrictEqual(expected);
      expect(mock).toBeCalledTimes(1);
    });
  });
});
