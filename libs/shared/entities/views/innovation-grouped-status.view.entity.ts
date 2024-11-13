import { JoinColumn, OneToOne, ViewColumn, ViewEntity } from 'typeorm';

import { InnovationEntity } from '../innovation/innovation.entity';

import type { InnovationGroupedStatusEnum } from '../../enums/innovation.enums';

// TODO: This view has dependency on the deploy date that affects behaviors for 6 months after the deploy. Code that
// references daysSinceNoActiveSupportOrDeploy should be updated after 6 months of the deploy date and the field removed
// and the view should remove the date.
@ViewEntity()
export class InnovationGroupedStatusViewEntity {
  @ViewColumn({ name: 'id' })
  innovationId: string;

  @ViewColumn({ name: 'grouped_status' })
  groupedStatus: InnovationGroupedStatusEnum;

  @ViewColumn({ name: 'name' })
  name: string;

  @ViewColumn({ name: 'created_by' })
  createdBy: string;

  @ViewColumn({ name: 'days_since_no_active_support' })
  daysSinceNoActiveSupport: number;

  @ViewColumn({ name: 'days_since_no_active_support_or_deploy' })
  daysSinceNoActiveSupportOrDeploy: number;

  @ViewColumn({ name: 'expected_archive_date' })
  expectedArchiveDate: Date;

  @OneToOne(() => InnovationEntity, record => record.id)
  @JoinColumn({ name: 'id' })
  innovation: InnovationEntity;
}
