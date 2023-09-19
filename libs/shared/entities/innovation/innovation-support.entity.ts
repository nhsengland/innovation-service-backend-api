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
import { InnovationTaskEntity } from './innovation-task.entity';
import { InnovationEntity } from './innovation.entity';

import { InnovationSupportStatusEnum } from '../../enums/innovation.enums';
import { UserRoleEntity } from '../user/user-role.entity';

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

  @ManyToMany(() => UserRoleEntity, userRole => userRole.innovationSupports, {
    nullable: true
  })
  @JoinTable({
    name: 'innovation_support_user',
    joinColumn: {
      name: 'innovation_support_id',
      referencedColumnName: 'id'
    },
    inverseJoinColumn: {
      name: 'user_role_id',
      referencedColumnName: 'id'
    }
  })
  userRoles: UserRoleEntity[];

  @OneToMany(() => InnovationTaskEntity, record => record.innovationSupport, { lazy: true })
  tasks: Promise<InnovationTaskEntity[]>;

  static new(data: Partial<InnovationSupportEntity>): InnovationSupportEntity {
    const instance = new InnovationSupportEntity();
    Object.assign(instance, data);
    return instance;
  }
}
