import { JoinColumn, OneToOne, ViewColumn, ViewEntity } from 'typeorm';
import { InnovationSupportEntity } from '../innovation/innovation-support.entity';

/**
 * This view is used to retrieve the last time a support is updated:
 *   - support status
 *   - progress update
 *   - task
 *   - thread
 */
@ViewEntity('innovation_support_last_activity_update_view')
export class SupportLastActivityUpdateView {
  @ViewColumn({ name: 'support_id' })
  supportId: string;

  @ViewColumn({ name: 'innovation_id' })
  innovationId: string;

  @ViewColumn({ name: 'organisation_unit_id' })
  organisationUnitId: string;

  @ViewColumn({ name: 'last_update' })
  lastUpdate: Date;

  @OneToOne(() => InnovationSupportEntity, record => record.id)
  @JoinColumn({ name: 'support_id' })
  support: InnovationSupportEntity;
}
