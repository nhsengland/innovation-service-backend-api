import type { DeepPartial, EntityManager } from 'typeorm';
import { NotifyMeSubscriptionEntity } from '../../entities';
import type { EventType, SubscriptionConfig, SubscriptionType } from '../../types';
import { BaseBuilder } from './base.builder';

export type TestNotifyMeSubscription = {
  id: string;
  eventType: EventType;
  subscriptionType: SubscriptionType;
  config: SubscriptionConfig;
};

export class NotifyMeSubscriptionBuilder extends BaseBuilder {
  private subscription: DeepPartial<NotifyMeSubscriptionEntity> = {};

  constructor(entityManager: EntityManager) {
    super(entityManager);
  }

  setInnovation(innovationId: string): NotifyMeSubscriptionBuilder {
    this.subscription.innovation = { id: innovationId };
    return this;
  }

  setConfig(config: SubscriptionConfig): NotifyMeSubscriptionBuilder {
    this.subscription.config = config;
    return this;
  }

  setUserRole(roleId: string): NotifyMeSubscriptionBuilder {
    this.subscription.userRole = { id: roleId };
    return this;
  }

  async save(): Promise<TestNotifyMeSubscription> {
    if (!(this.subscription.innovation || this.subscription.config || this.subscription.userRole)) {
      throw new Error('NotifyMeSubscriptionBuilder: Missing required fields');
    }

    const savedFile = await this.getEntityManager().getRepository(NotifyMeSubscriptionEntity).save(this.subscription);

    return {
      id: savedFile.id,
      eventType: savedFile.config.eventType,
      subscriptionType: savedFile.config.subscriptionType,
      config: savedFile.config
    };
  }
}
