import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { InnovationEntity } from './innovation.entity';

import { catalogPatientsCitizensBenefit } from '../../schemas/innovation-record/202209/catalog.types';

/**
 * @deprecated to be removed with InnovationEntity changes
 */
@Entity('innovation_patients_citizens_benefit')
export class InnovationPatientsCitizensBenefitEntity extends BaseEntity {
  @PrimaryColumn({ type: 'simple-enum', enum: catalogPatientsCitizensBenefit, nullable: false })
  type: catalogPatientsCitizensBenefit;

  @PrimaryColumn({ type: 'uniqueidentifier', name: 'innovation_id' })
  innovationId: string;

  @ManyToOne(() => InnovationEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationEntity;

  static new(
    data: Partial<InnovationPatientsCitizensBenefitEntity>
  ): InnovationPatientsCitizensBenefitEntity {
    const instance = new InnovationPatientsCitizensBenefitEntity();
    Object.assign(instance, data);
    return instance;
  }
}
