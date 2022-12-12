import { Column, Entity, JoinColumn, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import type { DateISOType } from '../../types';
import { InnovationAssessmentEntity } from '../innovation/innovation-assessment.entity';
import { InnovationSupportLogEntity } from '../innovation/innovation-support-log.entity';
import { OrganisationUnitUserEntity } from './organisation-unit-user.entity';
import { OrganisationEntity } from './organisation.entity';


@Entity('organisation_unit')
export class OrganisationUnitEntity extends BaseEntity {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  acronym: string;

  @Column({ name: 'is_shadow', nullable: false, default: false })
  isShadow: boolean;

  @Column({ name: 'inactivated_at', type: 'datetime2', nullable: true, default: null })
  inactivatedAt: null | DateISOType;

  @Column({ name: 'organisation_id', nullable: false})
  organisationId: string;

  @ManyToOne(() => OrganisationEntity, { nullable: false })
  @JoinColumn({ name: 'organisation_id' })
  organisation: OrganisationEntity;

  @ManyToMany(() => InnovationAssessmentEntity, record => record.organisationUnits, { lazy: true })
  innovationAssessments: Promise<InnovationAssessmentEntity[]>;

  @ManyToMany(() => InnovationSupportLogEntity, record => record.suggestedOrganisationUnits, { lazy: true })
  innovationSupportLogs: Promise<InnovationSupportLogEntity[]>;

  @OneToMany(() => OrganisationUnitUserEntity, record => record.organisationUnit, { lazy: true })
  organisationUnitUsers: Promise<OrganisationUnitUserEntity[]>;


  static new(data: Partial<OrganisationUnitEntity>): OrganisationUnitEntity {
    const instance = new OrganisationUnitEntity();
    Object.assign(instance, data);
    return instance;
  }

}
