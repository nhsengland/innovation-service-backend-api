import type { StatisticsResponse } from 'apps/admin/_config/statistics.config';
import { StatisticsHandler } from './statistics-handler';

export class InnovationsPerOrganisationUnitHandler extends StatisticsHandler<'INNOVATIONS_PER_UNIT'> {
  async run(): Promise<StatisticsResponse<'INNOVATIONS_PER_UNIT'>> {
    return this.statisticsService.getOrganisationUnitInnovationCounters(
      this.data.organisationUnitId
    );
  }
}
