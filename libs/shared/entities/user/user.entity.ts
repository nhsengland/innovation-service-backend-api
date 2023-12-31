import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { UserStatusEnum } from '../../enums/user.enums';
import { TermsOfUseUserEntity } from '../general/terms-of-use-user.entity';
import { UserRoleEntity } from './user-role.entity';

@Entity('user')
export class UserEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'external_id', type: 'nvarchar', nullable: false })
  identityId: string;

  @Column({ type: 'simple-enum', enum: UserStatusEnum, nullable: false })
  status: UserStatusEnum;

  @Column({ name: 'first_time_sign_in_at', type: 'datetime2', nullable: true })
  firstTimeSignInAt: null | Date;

  @Column({ name: 'locked_at', type: 'datetime2', nullable: true })
  lockedAt: null | Date;

  @Column({ name: 'delete_reason', type: 'nvarchar', nullable: true })
  deleteReason: null | string;

  @OneToMany(() => UserRoleEntity, record => record.user, { cascade: ['update', 'insert'] })
  serviceRoles: UserRoleEntity[];

  @OneToMany(() => TermsOfUseUserEntity, record => record.user, { lazy: true })
  termsOfUseUser: Promise<TermsOfUseUserEntity[]>;

  static new(data: Partial<UserEntity>): UserEntity {
    const instance = new UserEntity();
    Object.assign(instance, data);
    return instance;
  }
}
