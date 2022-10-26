import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { InnovationEntity } from './innovation.entity';

import { InnovationAreaCatalogueEnum } from '../../enums/catalog.enums';


@Entity('innovation_area')
@Index(['type', 'innovation'], { unique: true })
export class InnovationAreaEntity extends BaseEntity {

  @PrimaryColumn({ type: 'simple-enum', enum: InnovationAreaCatalogueEnum, nullable: false })
  type: InnovationAreaCatalogueEnum;

  @ManyToOne(() => InnovationEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationEntity;


  static new(data: Partial<InnovationAreaEntity>): InnovationAreaEntity {
    const instance = new InnovationAreaEntity();
    Object.assign(instance, data);
    return instance;
  }

}
