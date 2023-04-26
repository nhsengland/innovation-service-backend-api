import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { InnovationEntity } from './innovation.entity';

import { catalogGeneralBenefit } from '../../schemas/innovation-record/202209/catalog.types';

/**
 * @deprecated to be removed with InnovationEntity changes
 */
@Entity('innovation_general_benefit')
export class InnovationGeneralBenefitEntity extends BaseEntity {
  @PrimaryColumn({ type: 'simple-enum', enum: catalogGeneralBenefit, nullable: false })
  type: catalogGeneralBenefit;

  @PrimaryColumn({ type: 'uniqueidentifier', name: 'innovation_id' })
  innovationId: string;

  @ManyToOne(() => InnovationEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationEntity;

  static new(data: Partial<InnovationGeneralBenefitEntity>): InnovationGeneralBenefitEntity {
    const instance = new InnovationGeneralBenefitEntity();
    Object.assign(instance, data);
    return instance;
  }
}
