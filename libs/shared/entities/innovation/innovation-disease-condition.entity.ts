
import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { InnovationEntity } from './innovation.entity';

/**
 * @deprecated to be removed with InnovationEntity changes
 */
@Entity('innovation_disease_condition')
export class InnovationDiseaseConditionEntity extends BaseEntity {

  @PrimaryColumn({ nullable: false })
  type: string;

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
