import { waitingAssessmentStatisticsHandler } from './waiting-assessment.handler';

import { randNumber } from '@ngneat/falso';
import { TestsHelper } from '@users/shared/tests';
import { DTOsHelper } from '@users/shared/tests/helpers/dtos.helper';
import { StatisticsService } from '../../_services/statistics.service';

describe('Assigned Innovations Statistics Handler Suite', () => {
  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();
  const expected = {
    count: randNumber(),
    overdue: randNumber()
  };
  const mock = jest.spyOn(StatisticsService.prototype, 'waitingAssessment').mockResolvedValue(expected);

  it('should return statistics', async () => {
    const res = await waitingAssessmentStatisticsHandler(
      DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor)
    );
    expect(res).toStrictEqual(expected);
    expect(mock).toBeCalledTimes(1);
  });
});
