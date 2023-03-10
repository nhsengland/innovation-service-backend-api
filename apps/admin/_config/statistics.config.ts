import type { InnovationSupportStatusEnum } from '@admin/shared/enums';
import type { UnionToIntersection } from '@admin/shared/types';
import { InnovationsPerOrganisationUnitHandler } from '../_handlers/statistics/innovation-per-organisation-unit.handler';
import type { StatisticsHandler } from '../_handlers/statistics/statistics-handler';

// Define the different types and their payloads
export type ADMIN_STATISTICS_CONFIG = {
  INNOVATIONS_PER_UNIT: {
    payload: { organisationUnitId: string },
    response: { [k in InnovationSupportStatusEnum]?: number }
  },
  /*
   * this is an example only of how to add a new statistic with different payload and response
  INNOVATIONS_PER_ORG: {
    payload: { organisationId: string },
    response: { [k in InnovationSupportStatusEnum]?: {t: string, c: number} }
  }
  */
}

// Helpers
export type ADMIN_STATISTICS_TYPES = keyof ADMIN_STATISTICS_CONFIG;
export type StatisticsPayload<T extends ADMIN_STATISTICS_TYPES> = ADMIN_STATISTICS_CONFIG[T]['payload'];
export type StatisticsResponse<T extends ADMIN_STATISTICS_TYPES> = ADMIN_STATISTICS_CONFIG[T]['response'];

// This is user to point to the correct handlers
export const ADMIN_STATISTICS_CONFIG: {
  [k in ADMIN_STATISTICS_TYPES]: new (data: StatisticsPayload<k>) => StatisticsHandler<k>
} = {
  INNOVATIONS_PER_UNIT: InnovationsPerOrganisationUnitHandler
};
export const ADMIN_STATISTICS_TYPES = Object.keys(ADMIN_STATISTICS_CONFIG);

/**
 * this handler executes all the statistics and returns the results. This is strongly typed to ensure that the payload is correct for the handler and the response is correctly typed
 * @param statistics array of statistics to run
 * @param payload the payload required to produce those statistics
 * @returns dictionary of statistics and their responses
 */
export const handlerHelper = async <T extends ADMIN_STATISTICS_TYPES> (statistics: T[], payload: UnionToIntersection<StatisticsPayload<T>> ) : Promise<{ [k in T]: StatisticsResponse<k> }> => {
  const res = {} as { [k in T]: StatisticsResponse<k> };
  for(const statistic of statistics) {
    res[statistic] = await new ADMIN_STATISTICS_CONFIG[statistic](payload as any).run(); // TODO: fix this any but data is a superset of the handler payload so it should be fine
  }

  return res;
};
