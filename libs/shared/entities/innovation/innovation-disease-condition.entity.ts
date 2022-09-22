
import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { InnovationEntity } from './innovation.entity';

import { InnovationDiseaseConditionCatalogueEnum } from '../../enums/catalog.enums';


@Entity('innovation_disease_condition')
@Index(['type', 'innovation'], { unique: true })
export class InnovationDiseaseConditionEntity extends BaseEntity {

  @PrimaryColumn({ type: 'simple-enum', enum: InnovationDiseaseConditionCatalogueEnum, nullable: false })
  type: InnovationDiseaseConditionCatalogueEnum;


  @PrimaryColumn({ type: 'uniqueidentifier', nullable: false })
  @ManyToOne(() => InnovationEntity)
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationEntity;


  static new(data: Partial<InnovationDiseaseConditionEntity>): InnovationDiseaseConditionEntity {
    const instance = new InnovationDiseaseConditionEntity();
    Object.assign(instance, data);
    return instance;
  }

}
