import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { InnovationEntity } from './innovation.entity';

import { EnvironmentalBenefitCatalogueEnum } from '../../enums/catalog.enums';


@Entity('innovation_environmental_benefit')
@Index(['type', 'innovation'], { unique: true })
export class InnovationEnvironmentalBenefitEntity extends BaseEntity {

  @PrimaryColumn({ type: 'simple-enum', enum: EnvironmentalBenefitCatalogueEnum })
  type: EnvironmentalBenefitCatalogueEnum;


  @PrimaryColumn({ name: 'innovation_id', type: 'uniqueidentifier' })
  @ManyToOne(() => InnovationEntity)
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationEntity;


  static new(data: Partial<InnovationEnvironmentalBenefitEntity>): InnovationEnvironmentalBenefitEntity {
    const instance = new InnovationEnvironmentalBenefitEntity();
    Object.assign(instance, data);
    return instance;
  }

}
