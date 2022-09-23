import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { InnovationSubgroupEntity } from './innovation-subgroup.entity';

import { SubgroupBenefitCatalogueEnum } from '../../enums/catalog.enums';


@Entity('innovation_subgroup_benefit')
@Index(['type', 'innovationSubgroup'], { unique: true })
export class InnovationSubgroupBenefitEntity extends BaseEntity {

  @PrimaryColumn({ type: 'simple-enum', enum: SubgroupBenefitCatalogueEnum })
  type: SubgroupBenefitCatalogueEnum;


  @PrimaryColumn({ name: 'innovation_subgroup_id', type: 'uniqueidentifier' })
  @ManyToOne(() => InnovationSubgroupEntity)
  @JoinColumn({ name: 'innovation_subgroup_id' })
  innovationSubgroup: InnovationSubgroupEntity;


  static new(data: Partial<InnovationSubgroupBenefitEntity>): InnovationSubgroupBenefitEntity {
    const instance = new InnovationSubgroupBenefitEntity();
    Object.assign(instance, data);
    return instance;
  }

}
