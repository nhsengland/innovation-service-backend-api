import type { InnovationGroupedStatusEnum } from 'libs/shared/enums';
import { JoinColumn, OneToOne, ViewColumn, ViewEntity } from 'typeorm';
import { InnovationEntity } from '../innovation/innovation.entity';

@ViewEntity()
export class InnovationGroupedStatusViewEntity {

  @ViewColumn({ name: 'grouped_status' })
  groupedStatus: InnovationGroupedStatusEnum;

  @OneToOne(() => InnovationEntity, record => record.id, { lazy: true })
  @JoinColumn({ name: 'id' })
  innovation: Promise<InnovationEntity>;
}
