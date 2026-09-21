import { TasksOpenStatisticsHandler } from './tasks-open.handler';

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

  const expected = [
    {
      section: 'INNOVATION_DESCRIPTION' as const,
      updatedAt: randPastDate()
    },
    {
      section: 'INNOVATION_DESCRIPTION' as const,
      updatedAt: randPastDate()
    }
  ];
  const mock = jest.spyOn(StatisticsService.prototype, 'getTasks').mockResolvedValue(expected);

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('run', () => {
    it('should return the statistic', async () => {
      const handler = new TasksOpenStatisticsHandler(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        { innovationId: randUuid() }
      );
      const res = await handler.run();
      expect(res).toStrictEqual({
        count: expected.length,
        lastSubmittedSection: expected[0]?.section,
        lastSubmittedAt: expected[0]?.updatedAt
      });
      expect(mock).toBeCalledTimes(1);
    });

    it('should return the statistic with null values', async () => {
      mock.mockResolvedValueOnce([]);
      const handler = new TasksOpenStatisticsHandler(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        { innovationId: randUuid() }
      );
      const res = await handler.run();
      expect(res).toStrictEqual({
        count: 0,
        lastSubmittedSection: null,
        lastSubmittedAt: null
      });
      expect(mock).toBeCalledTimes(1);
    });
  });
});
