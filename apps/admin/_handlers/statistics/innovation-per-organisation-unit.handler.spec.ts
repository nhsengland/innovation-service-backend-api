import { InnovationsPerOrganisationUnitHandler } from './innovation-per-organisation-unit.handler';

import { randNumber, randUuid } from '@ngneat/falso';
import { StatisticsService } from '../../_services/statistics.service';

describe('Actions To Review Statistics Handler Suite', () => {
  // const testsHelper = new TestsHelper();
  const expected = { CLOSED: randNumber() };
  const mock = jest
    .spyOn(StatisticsService.prototype, 'getOrganisationUnitInnovationCounters')
    .mockResolvedValue(expected);
  const handler = new InnovationsPerOrganisationUnitHandler({ organisationUnitId: randUuid() });

  it('should return statistics', async () => {
    const res = await handler.run();
    expect(res).toStrictEqual(expected);
    expect(mock).toBeCalledTimes(1);
  });
});
