import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';
import { UserEntity } from './user.entity';
import { OrganisationEntity } from '../organisation/organisation.entity';
import { StrategicRoleEnum } from '../../enums/strategic-role.enum';

@Entity('user_strategic_role')
export class UserStrategicRoleEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'strategic_role', type: 'simple-enum', enum: StrategicRoleEnum, nullable: false })
  strategicRole: StrategicRoleEnum;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => UserEntity, record => record.strategicRoles, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @ManyToOne(() => OrganisationEntity, record => record.strategicRoles, { nullable: false })
  @JoinColumn({ name: 'organisation_id' })
  organisation: OrganisationEntity;

  static new(data: Partial<UserStrategicRoleEntity>): UserStrategicRoleEntity {
    const instance = new UserStrategicRoleEntity();
    Object.assign(instance, data);
    return instance;
  }
}
