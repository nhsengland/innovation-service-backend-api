
import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { InnovationEntity } from './innovation.entity';

import { InnovationDiseaseConditionCatalogueEnum } from '../../enums/catalog.enums';


@Entity('innovation_disease_condition')
export class InnovationDiseaseConditionEntity extends BaseEntity {

  @PrimaryColumn({ type: 'simple-enum', enum: InnovationDiseaseConditionCatalogueEnum, nullable: false })
  type: InnovationDiseaseConditionCatalogueEnum;

  @PrimaryColumn({ type: 'uniqueidentifier', name: 'innovation_id' })
  innovationId: string;


  @ManyToOne(() => InnovationEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationEntity;


  static new(data: Partial<InnovationDiseaseConditionEntity>): InnovationDiseaseConditionEntity {
    const instance = new InnovationDiseaseConditionEntity();
    Object.assign(instance, data);
    return instance;
  }

}
