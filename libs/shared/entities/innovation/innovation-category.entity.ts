import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { InnovationEntity } from './innovation.entity';

import { InnovationCategoryCatalogueEnum } from '../../enums/catalog.enums';


@Entity('innovation_category')
export class InnovationCategoryEntity extends BaseEntity {

  @PrimaryColumn({ type: 'simple-enum', enum: InnovationCategoryCatalogueEnum, nullable: false })
  type: InnovationCategoryCatalogueEnum;

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
