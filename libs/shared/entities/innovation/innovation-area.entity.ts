import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { InnovationEntity } from './innovation.entity';

import { InnovationAreaCatalogueEnum } from '../../enums/catalog.enums';


@Entity('innovation_area')
export class InnovationAreaEntity extends BaseEntity {

  @PrimaryColumn({ type: 'simple-enum', enum: InnovationAreaCatalogueEnum, nullable: false })
  type: InnovationAreaCatalogueEnum;

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
