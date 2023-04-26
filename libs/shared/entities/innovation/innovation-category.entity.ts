import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { catalogCategory } from '../../schemas/innovation-record/202209/catalog.types';
import { InnovationEntity } from './innovation.entity';

/**
 * @deprecated to be removed with InnovationEntity changes
 */
@Entity('innovation_category')
export class InnovationCategoryEntity extends BaseEntity {
  @PrimaryColumn({ type: 'simple-enum', enum: catalogCategory, nullable: false })
  type: catalogCategory;

  @PrimaryColumn({ type: 'uniqueidentifier', name: 'innovation_id' })
  innovationId: string;

  @ManyToOne(() => InnovationEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationEntity;

  static new(data: Partial<InnovationCategoryEntity>): InnovationCategoryEntity {
    const instance = new InnovationCategoryEntity();
    Object.assign(instance, data);
    return instance;
  }
}
