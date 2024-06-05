import { inject, injectable } from 'inversify';
import type { EntityManager } from 'typeorm';

import {
  InnovationEntity,
  NotificationScheduleEntity,
  NotifyMeSubscriptionEntity,
  UserRoleEntity
} from '@users/shared/entities';
import type { DomainContextType, SubscriptionConfig, NotifyMeMessageType } from '@users/shared/types';

import { BaseService } from './base.service';
import { SHARED_SYMBOLS } from '@users/shared/services/symbols';
import type { StorageQueueService } from '@users/shared/services';
import { QueuesEnum } from '@users/shared/services/integrations/storage-queue.service';


@injectable()
export class NotifyMeService extends BaseService {
  constructor(@inject(SHARED_SYMBOLS.StorageQueueService) private storageQueueService: StorageQueueService) {
    super();
  }

  async createSubscription(
    domainContext: DomainContextType,
    innovationId: string,
    config: SubscriptionConfig,
    entityManager?: EntityManager
  ): Promise<void> {
    const em = entityManager ?? this.sqlConnection.manager;

    await em.save(
      NotifyMeSubscriptionEntity,
      NotifyMeSubscriptionEntity.new({
        createdBy: domainContext.id,
        config: config,
        userRole: UserRoleEntity.new({ id: domainContext.currentRole.id }),
        innovation: InnovationEntity.new({ id: innovationId })
      })
    );

    if (config.subscriptionType === 'SCHEDULED') {
      await this.storageQueueService.sendMessage<NotifyMeMessageType<'REMINDER'>>(QueuesEnum.NOTIFY_ME, {
        data: {
          requestUser: domainContext,
          innovationId,

          type: 'REMINDER',

          params: {}
        }
      });
    }
  }

  async getSubscriptions(
    domainContext: DomainContextType,
    queryParams: { innovationId?: string },
    entityManager?: EntityManager
  ): Promise<
    {
      id: string;
      innovation: { id: string; name: string };
      config: SubscriptionConfig;
      scheduledNotification?: {
        sendDate: Date;
        params: { inApp: Record<string, unknown>; email: Record<string, unknown> };
      };
    }[]
  > {
    const em = entityManager ?? this.sqlConnection.manager;

    const query = em
      .createQueryBuilder(NotifyMeSubscriptionEntity, 'subscription')
      .select([
        'subscription.id',
        'subscription.config',
        'innovation.id',
        'innovation.name',
        'scheduled.sendDate',
        'scheduled.params'
      ])
      .innerJoin('subscription.innovation', 'innovation')
      .leftJoin('subscription.scheduledNotification', 'scheduled')
      .where('subscription.user_role_id = :roleId', { roleId: domainContext.currentRole.id });

    if (queryParams?.innovationId) {
      query.andWhere('subscription.innovation_id = :innovationId', { innovationId: queryParams.innovationId });
    }

    const subscriptions = await query.getMany();

    return subscriptions.map(s => ({
      id: s.id,
      config: s.config,
      innovation: { id: s.innovation.id, name: s.innovation.name },
      scheduledNotification: s.scheduledNotification
        ? {
            sendDate: s.scheduledNotification.sendDate,
            params: s.scheduledNotification.params
          }
        : undefined
    }));
  }

  async deleteSubscription(
    domainContext: DomainContextType,
    subscriptionId: string,
    entityManager?: EntityManager
  ): Promise<void> {
    const em = entityManager ?? this.sqlConnection.manager;

    await em.transaction(async transaction => {
      const result = await transaction.softDelete(NotifyMeSubscriptionEntity, {
        id: subscriptionId,
        userRole: { id: domainContext.currentRole.id }
      });

      // NOTE: We have to confirm that if a subscription is removed we want to remove the schedule associated with it
      if (result?.affected) {
        await transaction.delete(NotificationScheduleEntity, { subscriptionId });
      }
    });
  }
}
