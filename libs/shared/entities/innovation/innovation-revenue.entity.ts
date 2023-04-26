import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { InnovationEntity } from './innovation.entity';

import { catalogRevenues } from '../../schemas/innovation-record/202209/catalog.types';

/**
 * @deprecated to be removed with InnovationEntity changes
 */
@Entity('innovation_revenue')
export class InnovationRevenueEntity extends BaseEntity {
  @PrimaryColumn({ type: 'simple-enum', enum: catalogRevenues, nullable: false })
  type: catalogRevenues;

  @PrimaryColumn({ type: 'uniqueidentifier', name: 'innovation_id' })
  innovationId: string;

  @ManyToOne(() => InnovationEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationEntity;

  static new(data: Partial<InnovationRevenueEntity>): InnovationRevenueEntity {
    const instance = new InnovationRevenueEntity();
    Object.assign(instance, data);
    return instance;
  }
}
