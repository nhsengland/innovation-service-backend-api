import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';
import { InnovationEntity } from '../innovation/innovation.entity';
import { UserRoleEntity } from './user-role.entity';
import { NotificationScheduleEntity } from './notification-schedule.entity';

import type { SubscriptionConfig } from '../../types';

@Entity('notify_me_subscription')
export class NotifyMeSubscriptionEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'event_type', type: 'nvarchar', update: false, insert: false })
  eventType: SubscriptionConfig['eventType'];

  @Column({ name: 'subscription_type', type: 'nvarchar', update: false, insert: false })
  subscriptionType: SubscriptionConfig['subscriptionType'];

  @Column({ type: 'simple-json' })
  config: SubscriptionConfig;

  @ManyToOne(() => InnovationEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationEntity;

  @ManyToOne(() => UserRoleEntity, { nullable: false })
  @JoinColumn({ name: 'user_role_id' })
  userRole: UserRoleEntity;

  @OneToOne(() => NotificationScheduleEntity, { nullable: true })
  @JoinColumn({ name: 'id' })
  scheduledNotification: NotificationScheduleEntity | null;

  static new(data: Partial<NotifyMeSubscriptionEntity>): NotifyMeSubscriptionEntity {
    const instance = new NotifyMeSubscriptionEntity();
    Object.assign(instance, data);
    return instance;
  }
}
