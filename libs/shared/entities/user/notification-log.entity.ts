import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';


import { NotificationLogTypeEnum } from '../../enums/notification.enums';


@Entity('notification_log')
export class NotificationLogEntity extends BaseEntity {
  
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({name: 'notification_type',type: 'simple-enum', enum: NotificationLogTypeEnum, nullable: false })
  notificationType: NotificationLogTypeEnum;

  @Column({name: 'params',type: 'simple-json', nullable: false})
  notificationParams: Record<string, string | number>;

  static new(data: Partial<NotificationLogEntity>): NotificationLogEntity {
    const instance = new NotificationLogEntity();
    Object.assign(instance, data);
    return instance;
  }

}
