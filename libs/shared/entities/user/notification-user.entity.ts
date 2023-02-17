import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { NotificationEntity } from './notification.entity';
import { UserEntity } from './user.entity';

import type { DateISOType } from '../../types/date.types';
import { OrganisationUnitEntity } from '../organisation/organisation-unit.entity';
import { UserRoleEntity } from './user-role.entity';

@Entity('notification_user')
export class NotificationUserEntity extends BaseEntity {

  @PrimaryColumn({ name: 'id', type: 'bigint', generated: true })
  id: number;

  @Column({ name: 'read_at', type: 'datetime2', nullable: true })
  readAt: DateISOType;

  @ManyToOne(() => NotificationEntity)
  @JoinColumn({ name: 'notification_id' })
  notification: NotificationEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity; // This should probably be removed with organisationUnit to avoid two ways of doing the same thing

  @ManyToOne(() => OrganisationUnitEntity, { nullable: true })
  @JoinColumn({ name: 'organisation_unit_id' })
  organisationUnit: OrganisationUnitEntity | null;  // This is about to be deprecated just not removing yet to avoid introducing notification bugs

  @ManyToOne(() => UserRoleEntity)
  @JoinColumn({ name: 'user_role_id' })
  userRole: UserRoleEntity;

  static new(data: Partial<NotificationUserEntity>): NotificationUserEntity {
    const instance = new NotificationUserEntity();
    Object.assign(instance, data);
    return instance;
  }

}
