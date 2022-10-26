import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { InnovationEntity } from './innovation.entity';

import { InnovationSupportTypeCatalogueEnum } from '../../enums/catalog.enums';


@Entity('innovation_support_type')
@Index(['type', 'innovation'], { unique: true })
export class InnovationSupportTypeEntity extends BaseEntity {

  @PrimaryColumn({ type: 'simple-enum', enum: InnovationSupportTypeCatalogueEnum, nullable: false })
  type: InnovationSupportTypeCatalogueEnum;


  @ManyToOne(() => InnovationEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationEntity;


  static new(data: Partial<InnovationSupportTypeEntity>): InnovationSupportTypeEntity {
    const instance = new InnovationSupportTypeEntity();
    Object.assign(instance, data);
    return instance;
  }

}
