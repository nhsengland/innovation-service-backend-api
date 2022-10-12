import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { RoleEntity } from './role.entity';
import { UserEntity } from './user.entity';

import type { DateISOType } from '../../types/date.types';


@Entity('user_role')
export class UserRoleEntity extends BaseEntity {

  @PrimaryColumn()
  id: string;

  @Column({ name: 'active_since' })
  activeSince: DateISOType;


  @PrimaryColumn({ name: 'role_id', type: 'uniqueidentifier', nullable: false })
  @OneToOne(() => RoleEntity)
  @JoinColumn({ name: 'role_id' })
  role: RoleEntity;

  @ManyToOne(() => UserEntity, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;


  static new(data: Partial<UserRoleEntity>): UserRoleEntity {
    const instance = new UserRoleEntity();
    Object.assign(instance, data);
    return instance;
  }

}
