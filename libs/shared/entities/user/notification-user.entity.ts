import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { NotificationEntity } from './notification.entity';


import { UserRoleEntity } from './user-role.entity';

@Entity('notification_user')
export class NotificationUserEntity extends BaseEntity {

  @PrimaryColumn({ name: 'id', type: 'bigint', generated: true })
  id: number;

  @Column({ name: 'read_at', type: 'datetime2', nullable: true })
  readAt: Date;

  @ManyToOne(() => NotificationEntity)
  @JoinColumn({ name: 'notification_id' })
  notification: NotificationEntity;

  @ManyToOne(() => UserRoleEntity)
  @JoinColumn({ name: 'user_role_id' })
  userRole: UserRoleEntity;

  static new(data: Partial<NotificationUserEntity>): NotificationUserEntity {
    const instance = new NotificationUserEntity();
    Object.assign(instance, data);
    return instance;
  }

}
