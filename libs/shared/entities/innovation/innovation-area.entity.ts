import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { catalogAreas } from '../../schemas/innovation-record/202209/catalog.types';
import { InnovationEntity } from './innovation.entity';

/**
 * @deprecated to be removed with InnovationEntity changes
 */
@Entity('innovation_area')
export class InnovationAreaEntity extends BaseEntity {
  @PrimaryColumn({ type: 'simple-enum', enum: catalogAreas, nullable: false })
  type: catalogAreas;

  @PrimaryColumn({ type: 'uniqueidentifier', name: 'innovation_id' })
  innovationId: string;

  @ManyToOne(() => InnovationEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationEntity;

  static new(data: Partial<InnovationAreaEntity>): InnovationAreaEntity {
    const instance = new InnovationAreaEntity();
    Object.assign(instance, data);
    return instance;
  }
}
