import { TasksRespondedStatisticsHandler } from './tasks-responded.handler';

import { InnovationTaskStatusEnum } from '@innovations/shared/enums';
import { CurrentCatalogTypes } from '@innovations/shared/schemas/innovation-record';
import { TestsHelper } from '@innovations/shared/tests';
import { DTOsHelper } from '@innovations/shared/tests/helpers/dtos.helper';
import { randPastDate, randUuid } from '@ngneat/falso';
import { StatisticsService } from '../../_services/statistics.service';

describe('Tasks To Submit Statistics Handler Suite', () => {
  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await testsHelper.init();
  });

  const expectedGetTasksCounter = {
    [InnovationTaskStatusEnum.DONE]: 3,
    [InnovationTaskStatusEnum.DECLINED]: 2,
    [InnovationTaskStatusEnum.OPEN]: 1,
    lastUpdatedAt: randPastDate()
  };
  const expectedGetLastUpdatedTask = {
    id: randUuid(),
    updatedAt: randPastDate(),
    section: CurrentCatalogTypes.InnovationSections[0]
  };
  const mockGetTasksCounter = jest
    .spyOn(StatisticsService.prototype, 'getTasksCounter')
    .mockResolvedValue(expectedGetTasksCounter);
  const mockGetLastUpdatedTask = jest
    .spyOn(StatisticsService.prototype, 'getLastUpdatedTask')
    .mockResolvedValue(expectedGetLastUpdatedTask);

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
        lastUpdatedAt: expectedGetLastUpdatedTask.updatedAt,
        lastUpdatedSection: expectedGetLastUpdatedTask.section
      });
      expect(mockGetTasksCounter).toBeCalledTimes(1);
      expect(mockGetLastUpdatedTask).toBeCalledTimes(1);
    });
  });
});
