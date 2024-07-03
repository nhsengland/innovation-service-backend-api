import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryColumn } from 'typeorm';

import type { ScheduledConfig } from '../../types';
import { NotifyMeSubscriptionEntity } from './notify-me-subscription.entity';
import { UserRoleEntity } from './user-role.entity';

@Entity('notification_schedule')
export class NotificationScheduleEntity {
  @PrimaryColumn({ name: 'subscription_id' })
  subscriptionId: string;

  @Column({ name: 'send_date', type: 'datetime2' })
  sendDate: Date;

  @Column({ name: 'params', type: 'simple-json' })
  params: ScheduledConfig;

  @OneToOne(() => NotifyMeSubscriptionEntity, { nullable: false })
  @JoinColumn({ name: 'subscription_id' })
  subscription: NotifyMeSubscriptionEntity;

  @ManyToOne(() => UserRoleEntity, { nullable: false })
  @JoinColumn({ name: 'user_role_id' })
  userRole: UserRoleEntity;

  static new(data: Partial<NotificationScheduleEntity>): NotificationScheduleEntity {
    const instance = new NotificationScheduleEntity();
    Object.assign(instance, data);
    return instance;
  }
}
