import { JoinColumn, OneToOne, ViewColumn, ViewEntity } from 'typeorm';

import { InnovationEntity } from '../innovation/innovation.entity';

import type { InnovationGroupedStatusEnum } from '../../enums/innovation.enums';

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

  @ViewColumn({ name: 'days_since_last_support' })
  daysSinceLastSupport: number;

  @ViewColumn({ name: 'expected_archive_date' })
  expectedArchiveDate: Date;

  @OneToOne(() => InnovationEntity, record => record.id)
  @JoinColumn({ name: 'id' })
  innovation: InnovationEntity;
}
