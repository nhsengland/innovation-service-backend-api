import { injectable } from 'inversify';
import { Brackets, EntityManager } from 'typeorm';

import { BaseService } from './base.service';

import { NotificationScheduleEntity, NotifyMeSubscriptionEntity } from '@notifications/shared/entities';
import { ServiceRoleEnum } from '@notifications/shared/enums';
import type { EventType, SubscriptionConfig } from '@notifications/shared/types';

export type NotifyMeSubscriptionType<T extends EventType = EventType> = {
  id: string;
  roleId: string;
  innovationId: string;

  config: SubscriptionConfig & { eventType: T };
};

@injectable()
export class NotifyMeService extends BaseService {
  constructor() {
    super();
  }

  /**
   * Gets all the subscription related with the given event.
   *
   * It fetches all the subscriptions for the event type and the innovation where the event occurred.
   * Subsequent validations (e.g., pre-conditions validation) is done outside this method.
   *
   * If the user role is not active the subscription is not considered.
   */
  async getInnovationEventSubscriptions<T extends EventType>(
    innovationId: string,
    eventType: T,
    entityManager?: EntityManager
  ): Promise<NotifyMeSubscriptionType<T>[]> {
    const em = entityManager || this.sqlConnection.manager;

    const subscriptions = await em
      .createQueryBuilder(NotifyMeSubscriptionEntity, 'subscription')
      .select(['subscription.id', 'subscription.config', 'role.id'])
      .innerJoin('subscription.userRole', 'role')
      .where('subscription.innovation_id = :innovationId', { innovationId: innovationId })
      .andWhere('subscription.eventType = :eventType', { eventType: eventType })
      .andWhere('role.isActive = 1')
      // Currently this or could be simplified because only A/QA have subscription but future proofing
      .andWhere(
        new Brackets(qb => {
          qb.where('role.role NOT IN (:...roles)', {
            roles: [ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR]
          }).orWhere(
            `EXISTS(SELECT 1 FROM innovation_share
                 WHERE organisation_id = role.organisation_id
                 AND innovation_id = subscription.innovation_id)`
          );
        })
      )
      .getMany();

    return subscriptions.map(subscription => ({
      id: subscription.id,
      roleId: subscription.userRole.id,
      innovationId: innovationId,
      config: subscription.config as any // not validating as they were filtered
    }));
  }

  /**
   * Responsible for deleting the subscription and all the scheduled notifications related to it
   */
  async deleteSubscription(subscriptionId: string, entityManager?: EntityManager): Promise<void> {
    if (!entityManager) {
      return this.sqlConnection.manager.transaction(t => {
        return this.deleteSubscription(subscriptionId, t);
      });
    }

    await entityManager.softDelete(NotifyMeSubscriptionEntity, subscriptionId);
    await entityManager.delete(NotificationScheduleEntity, { subscriptionId: subscriptionId });
  }

  /**
   * Responsible for deleting the scheduled notifications for the given subscriptions
   */
  async deleteScheduledNotification(subscriptionId: string, entityManager?: EntityManager): Promise<void> {
    const em = entityManager || this.sqlConnection.manager;
    await em.delete(NotificationScheduleEntity, {
      subscriptionId: subscriptionId
    });
  }

  /**
   * Fetch all the pending scheduled notifications to be sent by the cron
   *
   * It gets all the scheduled notifications to be sent in the time it's fetching the DB,
   * to make sure that in case of failure there is no notifications lost a grace period of 2H
   * is applied.
   */
  async getScheduledNotifications(
    entityManager?: EntityManager
  ): Promise<{ subscriptionId: string; innovationId: string; roleId: string; eventType: EventType }[]> {
    const em = entityManager || this.sqlConnection.manager;

    const scheduled = await em
      .createQueryBuilder(NotificationScheduleEntity, 'schedule')
      .select(['schedule.subscriptionId', 'subscription.id', 'subscription.eventType', 'innovation.id', 'role.id'])
      .innerJoin('schedule.subscription', 'subscription')
      .innerJoin('subscription.innovation', 'innovation')
      .innerJoin('subscription.userRole', 'role')
      .where('schedule.sendDate BETWEEN DATEADD(hour, -2, GETDATE()) AND GETDATE()')
      .getMany();

    return scheduled.map(s => ({
      subscriptionId: s.subscriptionId,
      innovationId: s.subscription.innovation.id,
      roleId: s.subscription.userRole.id,
      eventType: s.subscription.eventType
    }));
  }

  /**
   * Helper method to check if a notification is already scheduled for the given subscription
   */
  /*
  private async hasScheduledNotification(subscription: NotifyMeSubscriptionType): Promise<boolean> {
    const hasScheduledNotification = await this.sqlConnection
      .createQueryBuilder(NotificationScheduleEntity, 'scheduled')
      .where('scheduled.subscriptionId = :subscriptionId', { subscriptionId: subscription.id })
      .getCount();

    return !!hasScheduledNotification;
  }
  */
}
