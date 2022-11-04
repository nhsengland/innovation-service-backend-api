import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { InnovationEntity } from './innovation.entity';

import { InnovationSupportTypeCatalogueEnum } from '../../enums/catalog.enums';


@Entity('innovation_support_type')
export class InnovationSupportTypeEntity extends BaseEntity {

  @PrimaryColumn({ type: 'simple-enum', enum: InnovationSupportTypeCatalogueEnum, nullable: false })
  type: InnovationSupportTypeCatalogueEnum;

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
