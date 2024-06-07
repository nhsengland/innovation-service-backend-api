import { injectable } from 'inversify';
import type { EntityManager } from 'typeorm';

import {
  InnovationEntity,
  NotificationScheduleEntity,
  NotifyMeSubscriptionEntity,
  UserRoleEntity
} from '@users/shared/entities';
import type { DomainContextType, SubscriptionConfig } from '@users/shared/types';

import { groupBy } from 'lodash';
import type { DefaultResponseDTO, NotifyMeConfig, SupportUpdateResponseTypes } from '../_types/notify-me.types';
import { BaseService } from './base.service';

@injectable()
export class NotifyMeService extends BaseService {
  constructor() {
    // @inject(SHARED_SYMBOLS.StorageQueueService) private storageQueueService: StorageQueueService
    super();
  }

  async createSubscription(
    domainContext: DomainContextType,
    innovationId: string,
    config: NotifyMeConfig,
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

    /* TODO
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
    */
  }

  async getInnovationSubscriptions(
    domainContext: DomainContextType,
    innovationId: string,
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
        'subscription.config'
        // 'scheduled.sendDate',
        // 'scheduled.params'
      ])
      // .leftJoin('subscription.scheduledNotification', 'scheduled')
      .where('subscription.user_role_id = :roleId', { roleId: domainContext.currentRole.id })
      .andWhere('subscription.innovation_id = :innovationId', { innovationId: innovationId });

    // TODO orderBy

    const subscriptions = await query.getMany();

    // Retrieve required data
    const groupedSubscriptions = groupBy(subscriptions, 'config.eventType');
    const responseSubscriptions = Object.entries(groupedSubscriptions).map(([eventType, subscriptions]) =>
      eventType in this.#subscriptionResponseDTO
        ? this.#subscriptionResponseDTO[eventType as any](subscriptions)
        : this.defaultSubscriptionResponseDTO(subscriptions)
    );

    throw new Error('Not implemented');
  }

  readonly #subscriptionResponseDTO = {
    SUPPORT_UPDATED: this.x
  };

  private defaultSubscriptionResponseDTO(subscriptions: NotifyMeSubscriptionEntity[]): DefaultResponseDTO[] {
    return subscriptions.map(s => ({
      id: s.id,
      eventType: s.eventType,
      subscriptionType: s.subscriptionType
      // config: s.config,
      // scheduledNotification: s.scheduledNotification
      //   ? {
      //       sendDate: s.scheduledNotification.sendDate,
      //       params: s.scheduledNotification.params
      //     }
      //   : undefined
    }));
  }

  private x(subscriptions: NotifyMeSubscriptionEntity[]): SupportUpdateResponseTypes['SUPPORT_UPDATED'] {
    return this.defaultSubscriptionResponseDTO(subscriptions) as any;
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
