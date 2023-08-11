import { assignedInnovationsStatisticsHandler } from './assigned-innovations.handler';

import { randNumber } from '@ngneat/falso';
import { TestsHelper } from '@users/shared/tests';
import { DTOsHelper } from '@users/shared/tests/helpers/dtos.helper';
import { StatisticsService } from '../../_services/statistics.service';

describe('Assigned Innovations Statistics Handler Suite', () => {
  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();
  const expected = {
    count: randNumber(),
    total: randNumber(),
    overdue: randNumber()
  };
  const mock = jest.spyOn(StatisticsService.prototype, 'assignedInnovations').mockResolvedValue(expected);

  it('should return statistics', async () => {
    const res = await assignedInnovationsStatisticsHandler(
      DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor)
    );
    expect(res).toStrictEqual(expected);
    expect(mock).toBeCalledTimes(1);
  });
});
