import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { UserRoleEntity } from './user-role.entity';
import { NotificationPreferenceEntity } from './notification-preference.entity';
import { TermsOfUseUserEntity } from '../general/terms-of-use-user.entity';
import { OrganisationUserEntity } from '../organisation/organisation-user.entity';

import { UserTypeEnum } from '../../enums/user.enums';
import type { DateISOType } from '../../types/date.types';


@Entity('user')
export class UserEntity extends BaseEntity {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'external_id', type: 'nvarchar', nullable: false })
  identityId: string;

  @Column({ type: 'simple-enum', enum: UserTypeEnum, nullable: false })
  type: UserTypeEnum;

  @Column({ name: 'survey_id', type: 'nvarchar', nullable: true })
  surveyId: null | string;

  @Column({ name: 'first_time_sign_in_at', type: 'datetime2', nullable: true })
  firstTimeSignInAt: null | DateISOType;

  @Column({ name: 'locked_at', type: 'datetime2', nullable: true })
  lockedAt: null | DateISOType;

  @Column({ name: 'delete_reason', type: 'nvarchar', nullable: true })
  deleteReason: null | string;


  @OneToMany(() => OrganisationUserEntity, record => record.user, { lazy: true })
  userOrganisations: Promise<OrganisationUserEntity[]>;

  @OneToMany(() => UserRoleEntity, record => record.user, { cascade: ['update', 'insert'] })
  serviceRoles: UserRoleEntity[];

  @OneToMany(() => NotificationPreferenceEntity, record => record.user, { lazy: true })
  notificationPreferences: Promise<NotificationPreferenceEntity[]>;

  @OneToMany(() => TermsOfUseUserEntity, record => record.user, { lazy: true })
  termsOfUseUser: Promise<TermsOfUseUserEntity[]>;


  static new(data: Partial<UserEntity>): UserEntity {
    const instance = new UserEntity();
    Object.assign(instance, data);
    return instance;
  }

}
