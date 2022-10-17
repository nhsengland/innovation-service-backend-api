import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { OrganisationUnitEntity } from '../organisation/organisation-unit.entity';
import { InnovationEntity } from './innovation.entity';

import { InnovationSupportLogTypeEnum } from '../../enums/innovation.enums';


@Entity('innovation_support_log')
export class InnovationSupportLogEntity extends BaseEntity {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'type' })
  type: InnovationSupportLogTypeEnum;

  @Column({ name: 'innovation_support_status' })
  innovationSupportStatus: string;

  @Column({ name: 'description' })
  description: string;


  @ManyToOne(() => InnovationEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationEntity;

  @ManyToOne(() => OrganisationUnitEntity, { nullable: true })
  @JoinColumn({ name: 'organisation_unit_id' })
  organisationUnit: OrganisationUnitEntity;

  @ManyToMany(() => OrganisationUnitEntity, record => record.innovationSupportLogs, { nullable: true })
  @JoinTable({
    name: 'innovation_support_log_organisation_unit',
    joinColumn: {
      name: 'innovation_support_log_id',
      referencedColumnName: 'id'
    },
    inverseJoinColumn: {
      name: 'organisation_unit_id',
      referencedColumnName: 'id'
    },
  })
  suggestedOrganisationUnits: OrganisationUnitEntity[];


  static new(data: Partial<InnovationSupportLogEntity>): InnovationSupportLogEntity {
    const instance = new InnovationSupportLogEntity();
    Object.assign(instance, data);
    return instance;
  }

}
