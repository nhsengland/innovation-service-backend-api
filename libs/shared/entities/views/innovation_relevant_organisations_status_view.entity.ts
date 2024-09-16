import { InnovationRelevantOrganisationsStatusEnum } from '../../enums';
import { Column, ViewColumn, ViewEntity } from 'typeorm';

/**
 * This view is used to retrieve the organisations, units and respective users that are in the followind relational status:
 * - ENGANGING
 * - WAITING
 * - SUGGESTED
 * - PREVIOUS_ENGAGED
 *
 */
@ViewEntity('innovation_relevant_organisations_status_view')
export class InnovationRelevantOrganisationsStatusView {
  @ViewColumn({ name: 'innovation_id' })
  innovationId: string;

  @ViewColumn({ name: 'status' })
  status: InnovationRelevantOrganisationsStatusEnum;

  @Column({ name: 'organisation_data', type: 'simple-json' })
  organisationData: { id: string; name: string; acronym: string };

  @Column({ name: 'organisation_unit_data', type: 'simple-json' })
  organisationUnitData: { id: string; name: string; acronym: string };

  @Column({ name: 'user_data', type: 'simple-json' })
  userData: { roleId: string; userId: string }[] | null;
}
