import { UnreadMessagesStatisticsHandler } from './unread-messages.handler';

import { TestsHelper } from '@innovations/shared/tests';
import { DTOsHelper } from '@innovations/shared/tests/helpers/dtos.helper';
import { randNumber, randPastDate, randUuid } from '@ngneat/falso';
import { StatisticsService } from '../../_services/statistics.service';

describe('Unread Messages Statistics Handler Suite', () => {
  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await testsHelper.init();
  });

  const expected = {
    count: randNumber(),
    lastSubmittedAt: randPastDate()
  };
  const mock = jest.spyOn(StatisticsService.prototype, 'getUnreadMessages').mockResolvedValue(expected);

  describe('run', () => {
    it('should return the statistic', async () => {
      const handler = new UnreadMessagesStatisticsHandler(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        { innovationId: randUuid() }
      );
      const res = await handler.run();
      expect(res).toStrictEqual(expected);
      expect(mock).toBeCalledTimes(1);
    });
  });
});
