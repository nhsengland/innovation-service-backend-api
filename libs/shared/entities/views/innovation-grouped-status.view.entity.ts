import { JoinColumn, OneToOne, ViewColumn, ViewEntity } from 'typeorm';

import { InnovationEntity } from '../innovation/innovation.entity';

import type { InnovationGroupedStatusEnum } from '../../enums/innovation.enums';

@ViewEntity()
export class InnovationGroupedStatusViewEntity {
  @ViewColumn({ name: 'id' })
  innovationId: string;

  @ViewColumn({ name: 'grouped_status' })
  groupedStatus: InnovationGroupedStatusEnum;

  @OneToOne(() => InnovationEntity, (record) => record.id)
  @JoinColumn({ name: 'id' })
  innovation: InnovationEntity;
}
