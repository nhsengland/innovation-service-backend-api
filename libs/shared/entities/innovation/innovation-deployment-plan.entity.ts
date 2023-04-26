import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { InnovationEntity } from '../innovation/innovation.entity';

@Entity('innovation_deployment_plan')
export class InnovationDeploymentPlanEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ name: 'commercial_basis', nullable: true })
  commercialBasis: string;

  @Column({ name: 'org_deployment_affect', nullable: true })
  orgDeploymentAffect: string;

  @ManyToOne(() => InnovationEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationEntity;

  static new(data: Partial<InnovationDeploymentPlanEntity>): InnovationDeploymentPlanEntity {
    const instance = new InnovationDeploymentPlanEntity();
    Object.assign(instance, data);
    return instance;
  }
}
