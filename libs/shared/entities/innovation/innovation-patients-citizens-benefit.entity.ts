import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { InnovationEntity } from './innovation.entity';

import { SubgroupBenefitCatalogueEnum } from '../../enums/catalog.enums';


@Entity('innovation_patients_citizens_benefit')
@Index(['type', 'innovation'], { unique: true })
export class InnovationPatientsCitizensBenefitEntity extends BaseEntity {

  @PrimaryColumn({ type: 'simple-enum', enum: SubgroupBenefitCatalogueEnum, nullable: false })
  type: SubgroupBenefitCatalogueEnum;


  @PrimaryColumn({ type: 'uniqueidentifier', nullable: false })
  @ManyToOne(() => InnovationEntity)
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationEntity;


  static new(data: Partial<InnovationPatientsCitizensBenefitEntity>): InnovationPatientsCitizensBenefitEntity {
    const instance = new InnovationPatientsCitizensBenefitEntity();
    Object.assign(instance, data);
    return instance;
  }

}
