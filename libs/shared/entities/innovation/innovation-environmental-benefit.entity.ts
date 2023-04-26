import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { InnovationEntity } from './innovation.entity';

import { catalogEnvironmentalBenefit } from '../../schemas/innovation-record/202209/catalog.types';

/**
 * @deprecated to be removed with InnovationEntity changes
 */
@Entity('innovation_environmental_benefit')
export class InnovationEnvironmentalBenefitEntity extends BaseEntity {
  @PrimaryColumn({ type: 'simple-enum', enum: catalogEnvironmentalBenefit, nullable: false })
  type: catalogEnvironmentalBenefit;

  @PrimaryColumn({ type: 'uniqueidentifier', name: 'innovation_id' })
  innovationId: string;

  @ManyToOne(() => InnovationEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationEntity;

  static new(
    data: Partial<InnovationEnvironmentalBenefitEntity>
  ): InnovationEnvironmentalBenefitEntity {
    const instance = new InnovationEnvironmentalBenefitEntity();
    Object.assign(instance, data);
    return instance;
  }
}
