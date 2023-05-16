import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { EmailNotificationPreferenceEnum, EmailNotificationType } from '../../enums/notification.enums';
import { UserRoleEntity } from './user-role.entity';

@Entity('notification_preference')
export class NotificationPreferenceEntity extends BaseEntity {
  @PrimaryColumn({ type: 'simple-enum', enum: EmailNotificationType, name: 'notification_type' })
  notificationType: EmailNotificationType;

  @Column({ type: 'simple-enum', enum: EmailNotificationPreferenceEnum, nullable: false })
  preference: EmailNotificationPreferenceEnum;

  @PrimaryColumn({ name: 'user_role_id', type: 'uniqueidentifier' })
  @ManyToOne(() => UserRoleEntity)
  @JoinColumn({ name: 'user_role_id' })
  userRole: UserRoleEntity;

  static new(data: Partial<NotificationPreferenceEntity>): NotificationPreferenceEntity {
    const instance = new NotificationPreferenceEntity();
    Object.assign(instance, data);
    return instance;
  }
}
