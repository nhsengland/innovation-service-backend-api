import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { OrganisationUnitEntity } from '../organisation/organisation-unit.entity';
import { UserRoleEntity } from '../user/user-role.entity';
import { InnovationEntity } from './innovation.entity';

import { InnovationSupportLogTypeEnum, InnovationSupportStatusEnum } from '../../enums/innovation.enums';

@Entity('innovation_support_log')
export class InnovationSupportLogEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'type' })
  type: InnovationSupportLogTypeEnum;

  @Column({ name: 'innovation_support_status', type: 'simple-enum', enum: InnovationSupportStatusEnum, nullable: true })
  innovationSupportStatus: null | InnovationSupportStatusEnum;

  @Column({ name: 'description' })
  description: string;

  @Column({ name: 'params', type: 'simple-json', nullable: true })
  params: null | { title: string };

  @ManyToOne(() => InnovationEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationEntity;

  @ManyToOne(() => OrganisationUnitEntity, { nullable: true })
  @JoinColumn({ name: 'organisation_unit_id' })
  organisationUnit: null | OrganisationUnitEntity;

  @ManyToOne(() => UserRoleEntity)
  @JoinColumn({ name: 'created_by_user_role_id' })
  createdByUserRole: UserRoleEntity;

  @ManyToMany(() => OrganisationUnitEntity, record => record.innovationSupportLogs, {
    nullable: true
  })
  @JoinTable({
    name: 'innovation_support_log_organisation_unit',
    joinColumn: {
      name: 'innovation_support_log_id',
      referencedColumnName: 'id'
    },
    inverseJoinColumn: {
      name: 'organisation_unit_id',
      referencedColumnName: 'id'
    }
  })
  suggestedOrganisationUnits: null | OrganisationUnitEntity[];

  static new(data: Partial<InnovationSupportLogEntity>): InnovationSupportLogEntity {
    const instance = new InnovationSupportLogEntity();
    Object.assign(instance, data);
    return instance;
  }
}
