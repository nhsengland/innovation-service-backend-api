import { injectable } from 'inversify';

import { InnovationEntity } from '@admin/shared/entities';
import { InnovationSupportStatusEnum } from '@admin/shared/enums';
import type { EntityManager } from 'typeorm';
import { BaseService } from './base.service';

@injectable()
export class StatisticsService extends BaseService {
  /**
   * returns the organisation unit number of innovations per status
   *
   * Note: UNASSIGNED that might be returned from this method don't include supports that never existed. We have two "unassigned" status for supports and it
   *       might or might not be relevant to distinguish them.
   *
   * @param organisationUnitId the organisation unit
   * @param onlyOpen if true, only returns the number of innovations with open statuses (ENGAGING)
   * @returns dictionary of status and number of innovations
   */
  async getOrganisationUnitInnovationCounters(
    organisationUnitId: string,
    onlyOpen = true,
    entityManager?: EntityManager
  ): Promise<{ [k in InnovationSupportStatusEnum]?: number }> {
    const em = entityManager ?? this.sqlConnection.manager;

    const query = em
      .createQueryBuilder(InnovationEntity, 'innovation')
      .select('count(1)', 'count')
      .addSelect('supports.status', 'status')
      .leftJoin('innovation.innovationSupports', 'supports')
      .leftJoin('supports.organisationUnit', 'organisationUnit')
      .where('organisationUnit.id = :organisationUnitId', {
        organisationUnitId
      });

    if (onlyOpen) {
      query.andWhere('supports.status = :engageStatus', { engageStatus: InnovationSupportStatusEnum.ENGAGING });
    }

    query.groupBy('supports.status');

    return (
      await query.getRawMany<{
        count: number;
        status: InnovationSupportStatusEnum;
      }>()
    ).reduce(
      (acc, cur) => {
        acc[cur.status] = cur.count;
        return acc;
      },
      {} as { [k in InnovationSupportStatusEnum]?: number }
    );
  }
}
