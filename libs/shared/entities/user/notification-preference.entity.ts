import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { UserEntity } from './user.entity';

import { EmailNotificationPreferenceEnum, EmailNotificationTypeEnum } from '../../enums/notification.enums';


@Entity('notification_preference')
export class NotificationPreferenceEntity extends BaseEntity {

  @PrimaryColumn({ type: 'simple-enum', enum: EmailNotificationTypeEnum })
  notification_id: EmailNotificationTypeEnum;

  @Column({ type: 'simple-enum', enum: EmailNotificationPreferenceEnum, nullable: false })
  preference: EmailNotificationPreferenceEnum;


  @PrimaryColumn({ type: 'uniqueidentifier', nullable: false })
  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;


  static new(data: Partial<NotificationPreferenceEntity>): NotificationPreferenceEntity {
    const instance = new NotificationPreferenceEntity();
    Object.assign(instance, data);
    return instance;
  }

}
