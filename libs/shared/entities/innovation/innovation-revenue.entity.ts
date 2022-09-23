import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { InnovationEntity } from './innovation.entity';

import { InnovationRevenueTypeCatalogueEnum } from '../../enums/catalog.enums';


@Entity('innovation_revenue')
@Index(['type', 'innovation'], { unique: true })
export class InnovationRevenueEntity extends BaseEntity {

  @PrimaryColumn({ type: 'simple-enum', enum: InnovationRevenueTypeCatalogueEnum })
  type: InnovationRevenueTypeCatalogueEnum;


  @PrimaryColumn({ name: 'innovation_id', type: 'uniqueidentifier' })
  @ManyToOne(() => InnovationEntity)
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationEntity;


  static new(data: Partial<InnovationRevenueEntity>): InnovationRevenueEntity {
    const instance = new InnovationRevenueEntity();
    Object.assign(instance, data);
    return instance;
  }

}
