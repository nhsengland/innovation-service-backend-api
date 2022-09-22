import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { NotificationEntity } from './notification.entity';
import { UserEntity } from './user.entity';


@Entity('notification_user')
export class NotificationUserEntity extends BaseEntity {

  @Column({ name: 'read_at', nullable: true })
  readAt: Date;


  @PrimaryColumn({ type: 'uniqueidentifier', nullable: false })
  @ManyToOne(() => NotificationEntity)
  @JoinColumn({ name: 'notification_id' })
  notification: NotificationEntity;

  @PrimaryColumn({ type: 'uniqueidentifier', nullable: false })
  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;


  static new(data: Partial<NotificationUserEntity>): NotificationUserEntity {
    const instance = new NotificationUserEntity();
    Object.assign(instance, data);
    return instance;
  }

}
