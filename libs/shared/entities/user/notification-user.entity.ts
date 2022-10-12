import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { NotificationEntity } from './notification.entity';
import { UserEntity } from './user.entity';

import type { DateISOType } from '../../types/date.types';


@Entity('notification_user')
export class NotificationUserEntity extends BaseEntity {

  @Column({ name: 'read_at', nullable: true })
  readAt: DateISOType;


  @PrimaryColumn({ name: 'notification_id', type: 'uniqueidentifier' })
  @ManyToOne(() => NotificationEntity)
  @JoinColumn({ name: 'notification_id' })
  notification: NotificationEntity;

  @PrimaryColumn({ name: 'user_id', type: 'uniqueidentifier' })
  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;


  static new(data: Partial<NotificationUserEntity>): NotificationUserEntity {
    const instance = new NotificationUserEntity();
    Object.assign(instance, data);
    return instance;
  }

}
