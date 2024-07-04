import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';

import { NotifyMeSubscriptionEntity } from './notify-me-subscription.entity';

@Entity('notification_schedule')
export class NotificationScheduleEntity {
  @PrimaryColumn({ name: 'subscription_id' })
  subscriptionId: string;

  @Column({ name: 'send_date', type: 'datetime2' })
  sendDate: Date;

  @OneToOne(() => NotifyMeSubscriptionEntity, { nullable: false })
  @JoinColumn({ name: 'subscription_id' })
  subscription: NotifyMeSubscriptionEntity;

  static new(data: Partial<NotificationScheduleEntity>): NotificationScheduleEntity {
    const instance = new NotificationScheduleEntity();
    Object.assign(instance, data);
    return instance;
  }
}
