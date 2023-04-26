import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { InnovationEntity } from '../innovation/innovation.entity';
import { InnovationSubgroupBenefitEntity } from './innovation-subgroup-benefit.entity';

import type {
  catalogCarePathway,
  catalogCostComparison,
  catalogPatientRange,
} from '../../schemas/innovation-record/202209/catalog.types';

/**
 * @deprecated to be removed with InnovationEntity changes
 */
@Entity('innovation_subgroup')
export class InnovationSubgroupEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  conditions: string;

  @Column({ name: 'care_pathway', type: 'nvarchar', nullable: true })
  carePathway: catalogCarePathway;

  @Column({ name: 'cost_description', type: 'nvarchar', nullable: true })
  costDescription: string;

  @Column({ name: 'patients_range', type: 'nvarchar', nullable: true })
  patientsRange: catalogPatientRange;

  @Column({ name: 'sell_expectations', type: 'nvarchar', nullable: true })
  sellExpectations: string;

  @Column({ name: 'usage_expectations', type: 'nvarchar', nullable: true })
  usageExpectations: string;

  @Column({ name: 'cost_comparison', type: 'nvarchar', nullable: true })
  costComparison: catalogCostComparison;

  @Column({ name: 'other_benefit', type: 'nvarchar', nullable: true })
  otherBenefit: string;

  @Column({ name: 'other_condition', type: 'nvarchar', nullable: true })
  otherCondition: string;

  @ManyToOne(() => InnovationEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationEntity;

  @OneToMany(() => InnovationSubgroupBenefitEntity, (record) => record.innovationSubgroup, {
    lazy: true,
    cascade: ['insert', 'update'],
  })
  benefits: Promise<InnovationSubgroupBenefitEntity[]>;

  static new(data: Partial<InnovationSubgroupEntity>): InnovationSubgroupEntity {
    const instance = new InnovationSubgroupEntity();
    Object.assign(instance, data);
    return instance;
  }
}
