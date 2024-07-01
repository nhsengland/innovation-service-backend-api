import type { DeepPartial, EntityManager } from 'typeorm';
import { NotificationScheduleEntity, NotifyMeSubscriptionEntity } from '../../entities';
import type { EventType, SubscriptionConfig, SubscriptionType } from '../../types';
import { BaseBuilder } from './base.builder';

export type TestNotifyMeSubscription<T extends SubscriptionConfig = SubscriptionConfig> = {
  id: string;
  eventType: EventType;
  subscriptionType: SubscriptionType;
  config: T;
};

export class NotifyMeSubscriptionBuilder<T extends SubscriptionConfig> extends BaseBuilder {
  private subscription: DeepPartial<NotifyMeSubscriptionEntity> = {};

  constructor(entityManager: EntityManager) {
    super(entityManager);
  }

  setInnovation(innovationId: string): NotifyMeSubscriptionBuilder<T> {
    this.subscription.innovation = { id: innovationId };
    return this;
  }

  setConfig(config: SubscriptionConfig): NotifyMeSubscriptionBuilder<T> {
    this.subscription.config = config;
    return this;
  }

  setUserRole(roleId: string): NotifyMeSubscriptionBuilder<T> {
    this.subscription.userRole = { id: roleId };
    return this;
  }

  async save(): Promise<TestNotifyMeSubscription<T>> {
    if (!(this.subscription.innovation || this.subscription.config || this.subscription.userRole)) {
      throw new Error('NotifyMeSubscriptionBuilder: Missing required fields');
    }

    const subscription = await this.getEntityManager()
      .getRepository(NotifyMeSubscriptionEntity)
      .save(this.subscription);

    if (subscription.subscriptionType === 'SCHEDULED') {
      const { date, subscriptionType, ...params } = subscription.config as any;
      await this.getEntityManager()
        .getRepository(NotificationScheduleEntity)
        .save({
          subscriptionId: subscription.id,
          params,
          sendDate: date,
          userRole: { id: subscription.userRole.id }
        });
    }

    return {
      id: subscription.id,
      eventType: subscription.config.eventType,
      subscriptionType: subscription.config.subscriptionType,
      config: subscription.config as T
    };
  }
}
