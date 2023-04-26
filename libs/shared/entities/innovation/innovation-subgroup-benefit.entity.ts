import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { InnovationSubgroupEntity } from './innovation-subgroup.entity';

// This entity is deprecated so just added the enum here
enum SubgroupBenefitCatalogueEnum {
  REDUCE_MORTALITY = 'REDUCE_MORTALITY',
  REDUCE_FURTHER_TREATMENT = 'REDUCE_FURTHER_TREATMENT',
  REDUCE_ADVERSE_EVENTS = 'REDUCE_ADVERSE_EVENTS',
  ENABLE_EARLIER_DIAGNOSIS = 'ENABLE_EARLIER_DIAGNOSIS',
  REDUCE_RISKS = 'REDUCE_RISKS',
  PREVENTS_CONDITION_OCCURRING = 'PREVENTS_CONDITION_OCCURRING',
  AVOIDS_UNNECESSARY_TREATMENT = 'AVOIDS_UNNECESSARY_TREATMENT',
  ENABLES_NON_INVASIVELY_TEST = 'ENABLES_NON_INVASIVELY_TEST',
  INCREASES_SELF_MANAGEMENT = 'INCREASES_SELF_MANAGEMENT',
  INCREASES_LIFE_QUALITY = 'INCREASES_LIFE_QUALITY',
  ENABLES_SHARED_CARE = 'ENABLES_SHARED_CARE',
}

@Entity('innovation_subgroup_benefit')
@Index(['type', 'innovationSubgroup'], { unique: true })
export class InnovationSubgroupBenefitEntity extends BaseEntity {
  @PrimaryColumn({ type: 'simple-enum', enum: SubgroupBenefitCatalogueEnum, nullable: false })
  type: SubgroupBenefitCatalogueEnum;

  @ManyToOne(() => InnovationSubgroupEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_subgroup_id' })
  innovationSubgroup: InnovationSubgroupEntity;

  static new(data: Partial<InnovationSubgroupBenefitEntity>): InnovationSubgroupBenefitEntity {
    const instance = new InnovationSubgroupBenefitEntity();
    Object.assign(instance, data);
    return instance;
  }
}
