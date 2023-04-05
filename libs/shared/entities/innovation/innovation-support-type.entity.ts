import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { catalogsupportTypes } from '../../schemas/innovation-record/202209/catalog.types';
import { InnovationEntity } from './innovation.entity';

/**
 * @deprecated to be removed with InnovationEntity changes
 */
@Entity('innovation_support_type')
export class InnovationSupportTypeEntity extends BaseEntity {

  @PrimaryColumn({ type: 'simple-enum', enum: catalogsupportTypes, nullable: false })
  type: catalogsupportTypes;

  @PrimaryColumn({ type: 'uniqueidentifier', name: 'innovation_id' })
  innovationId: string;


  @ManyToOne(() => InnovationEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationEntity;


  static new(data: Partial<InnovationSupportTypeEntity>): InnovationSupportTypeEntity {
    const instance = new InnovationSupportTypeEntity();
    Object.assign(instance, data);
    return instance;
  }

}
