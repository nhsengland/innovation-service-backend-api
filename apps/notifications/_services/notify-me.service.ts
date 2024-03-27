import { UserRoleEntity, NotifyMeSubscriptionEntity, NotificationScheduleEntity } from '@notifications/shared/entities';
import { injectable } from 'inversify';

import { BaseService } from './base.service';

import type { SubscriptionConfig } from '@notifications/shared/types';
import { In } from 'typeorm';
import type { EventPayload } from '../_notify-me/notify-me.handler';

export type NotifyMeSubscriptionType = {
  id: string;
  roleId: string;
  innovationId: string;

  config: SubscriptionConfig;
};

@injectable()
export class NotifyMeService extends BaseService {
  constructor() {
    super();
  }

  /**
   * Gets all the subscription related with the given event.
   *
   * It fetches all the subscriptions for the event type and the innovation where the event occured.
   * Subsequent validations (e.g., pre-conditions validation) is done outside this method.
   */
  async getEventSubscribers(event: EventPayload): Promise<NotifyMeSubscriptionType[]> {
    const subscriptions = await this.sqlConnection
      .createQueryBuilder(NotifyMeSubscriptionEntity, 'subscription')
      .select(['subscription.id', 'subscription.config', 'role.id'])
      .innerJoin('subscription.userRole', 'role')
      .where('subscription.innovation_id = :innovationId', { innovationId: event.innovationId })
      .andWhere('subscription.eventType = :eventType', { eventType: event.type })
      .getMany();

    return subscriptions.map(subscription => ({
      id: subscription.id,
      roleId: subscription.userRole.id,
      innovationId: event.innovationId,
      config: subscription.config
    }));
  }

  /**
   * Creates a new scheduled notification for the current subscription.
   *
   * It makes sure that no scheduled notification already exists for the given subscription
   * to prevent duplicates.
   */
  async createScheduledNotification(
    subscription: NotifyMeSubscriptionType,
    params: { inApp: Record<string, unknown>; email: Record<string, unknown> }
  ): Promise<void> {
    // If its a periodic we have to make sure that it doesn't exist one notification scheduled already.
    if (subscription.config.subscriptionType === 'PERIODIC') {
      const hasScheduledNotification = await this.hasScheduledNotification(subscription);
      if (hasScheduledNotification) return;
    }

    let now = new Date();
    switch (subscription.config.subscriptionType) {
      case 'PERIODIC':
        switch (subscription.config.periodicity) {
          case 'DAILY':
            now.setDate(now.getDate() + 1);
            break;
          case 'HOURLY':
            now.setHours(now.getHours() + 1);
            break;
        }
        break;

      case 'SCHEDULED':
        now = subscription.config.date;
        break;
    }

    await this.sqlConnection.manager.save(
      NotificationScheduleEntity,
      NotificationScheduleEntity.new({
        subscription: NotifyMeSubscriptionEntity.new({ id: subscription.id }),
        userRole: UserRoleEntity.new({ id: subscription.roleId }),
        sendDate: now,
        params: params
      })
    );
  }

  /**
   * Responsible for deleting the scheduled notifications for the given subscriptions
   *
   * Besides deleting the scheduled notifications that may exist, it makes sure to delete
   * the subscription as-well if its of a type 'SCHEDULED' (business rule).
   */
  async deleteScheduledNotifications(subscriptionIds: string[]): Promise<void> {
    await this.sqlConnection.manager.delete(NotificationScheduleEntity, {
      subscriptionId: In(subscriptionIds)
    });

    // We make sure to delete the subscription of the ones that were scheduled
    await this.sqlConnection.manager.softDelete(NotifyMeSubscriptionEntity, {
      id: In(subscriptionIds),
      subscriptionType: 'SCHEDULED'
    });
  }

  /**
   * Helper method to check if a notification is already scheduled for the given subscription
   */
  private async hasScheduledNotification(subscription: NotifyMeSubscriptionType): Promise<boolean> {
    const hasScheduledNotification = await this.sqlConnection
      .createQueryBuilder(NotificationScheduleEntity, 'scheduled')
      .where('scheduled.subscriptionId = :subscriptionId', { subscriptionId: subscription.id })
      .getCount();

    return !!hasScheduledNotification;
  }
}
