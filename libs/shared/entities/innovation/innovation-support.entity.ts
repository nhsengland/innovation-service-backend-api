import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn
} from 'typeorm';

import { BaseEntity } from '../base.entity';

import { OrganisationUnitEntity } from '../organisation/organisation-unit.entity';
import { OrganisationUnitUserEntity } from '../organisation/organisation-unit-user.entity';
import { InnovationEntity } from './innovation.entity';
import { InnovationActionEntity } from './innovation-action.entity';

import { InnovationSupportStatusEnum } from '../../enums/innovation.enums';

@Entity('innovation_support')
export class InnovationSupportEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'simple-enum', enum: InnovationSupportStatusEnum, nullable: false })
  status: InnovationSupportStatusEnum;

  @ManyToOne(() => InnovationEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationEntity;

  @ManyToOne(() => OrganisationUnitEntity, { nullable: false })
  @JoinColumn({ name: 'organisation_unit_id' })
  organisationUnit: OrganisationUnitEntity;

  // TODO: Replace with UserRoleEntity
  @ManyToMany(() => OrganisationUnitUserEntity, record => record.innovationSupports, {
    nullable: true
  })
  @JoinTable({
    name: 'innovation_support_user',
    joinColumn: {
      name: 'innovation_support_id',
      referencedColumnName: 'id'
    },
    inverseJoinColumn: {
      name: 'organisation_unit_user_id',
      referencedColumnName: 'id'
    }
  })
  organisationUnitUsers: OrganisationUnitUserEntity[];

  @OneToMany(() => InnovationActionEntity, record => record.innovationSupport, { lazy: true })
  actions: Promise<InnovationActionEntity[]>;

  static new(data: Partial<InnovationSupportEntity>): InnovationSupportEntity {
    const instance = new InnovationSupportEntity();
    Object.assign(instance, data);
    return instance;
  }
}
