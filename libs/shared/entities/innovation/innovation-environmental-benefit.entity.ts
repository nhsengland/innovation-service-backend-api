import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { InnovationEntity } from './innovation.entity';

import { EnvironmentalBenefitCatalogueEnum } from '../../enums/catalog.enums';


@Entity('innovation_environmental_benefit')
@Index(['type', 'innovation'], { unique: true })
export class InnovationEnvironmentalBenefitEntity extends BaseEntity {

  @PrimaryColumn({ type: 'simple-enum', enum: EnvironmentalBenefitCatalogueEnum, nullable: false })
  type: EnvironmentalBenefitCatalogueEnum;

  @ManyToOne(() => InnovationEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationEntity;


  static new(data: Partial<InnovationEnvironmentalBenefitEntity>): InnovationEnvironmentalBenefitEntity {
    const instance = new InnovationEnvironmentalBenefitEntity();
    Object.assign(instance, data);
    return instance;
  }

}
