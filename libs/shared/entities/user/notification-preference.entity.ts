import { Column, Entity, PrimaryColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import type { NotificationPreferences } from '../../types/notification.types';

@Entity('notification_preference')
export class NotificationPreferenceEntity extends BaseEntity {
  @Column({ name: 'preferences', type: 'simple-json' })
  preferences: NotificationPreferences;

  @PrimaryColumn({ name: 'user_role_id', type: 'uniqueidentifier' })
  userRoleId: string;

  static new(data: Partial<NotificationPreferenceEntity>): NotificationPreferenceEntity {
    const instance = new NotificationPreferenceEntity();
    Object.assign(instance, data);
    return instance;
  }
}
