import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { InnovationEntity } from './innovation.entity';

import { GeneralBenefitCatalogueEnum } from '../../enums/catalog.enums';


@Entity('innovation_general_benefit')
@Index(['type', 'innovation'], { unique: true })
export class InnovationGeneralBenefitEntity extends BaseEntity {

  @PrimaryColumn({ type: 'simple-enum', enum: GeneralBenefitCatalogueEnum, nullable: false })
  type: GeneralBenefitCatalogueEnum;

  @ManyToOne(() => InnovationEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationEntity;


  static new(data: Partial<InnovationGeneralBenefitEntity>): InnovationGeneralBenefitEntity {
    const instance = new InnovationGeneralBenefitEntity();
    Object.assign(instance, data);
    return instance;
  }

}
