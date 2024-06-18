import { injectable } from 'inversify';
import { groupBy } from 'lodash';
import type { EntityManager } from 'typeorm';

import {
  InnovationEntity,
  NotificationScheduleEntity,
  NotifyMeSubscriptionEntity,
  OrganisationUnitEntity,
  UserRoleEntity
} from '@users/shared/entities';
import { BadRequestError, ForbiddenError } from '@users/shared/errors';
import { NotificationErrorsEnum } from '@users/shared/errors/errors.enums';
import { AuthErrorsEnum } from '@users/shared/services/auth/authorization-validation.model';
import {
  isAccessorDomainContextType,
  type DomainContextType,
  type SubscriptionConfig,
  type SupportUpdateCreated
} from '@users/shared/types';
import type {
  DefaultResponseDTO,
  SubscriptionResponseDTO,
  SupportUpdateResponseTypes
} from '../_types/notify-me.types';
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
  ): Promise<SubscriptionResponseDTO[]> {
    const em = entityManager ?? this.sqlConnection.manager;

    const query = em
      .createQueryBuilder(NotifyMeSubscriptionEntity, 'subscription')
      .select([
        'subscription.id',
        'subscription.eventType',
        'subscription.config',
        'subscription.updatedAt'
        // 'scheduled.sendDate',
        // 'scheduled.params'
      ])
      // .leftJoin('subscription.scheduledNotification', 'scheduled')
      .where('subscription.user_role_id = :roleId', { roleId: domainContext.currentRole.id })
      .andWhere('subscription.innovation_id = :innovationId', { innovationId: innovationId })
      .orderBy('subscription.updatedAt', 'DESC');

    const subscriptions = await query.getMany();
    const groupedSubscriptions = groupBy(subscriptions, 'eventType');

    // Map of subscription ids to their DTOs
    const responseSubscriptions = new Map<string, SubscriptionResponseDTO>();
    for (const [eventType, subscriptions] of Object.entries(groupedSubscriptions)) {
      const responses =
        eventType in this.subscriptionResponseDTO
          ? await this.subscriptionResponseDTO[eventType as keyof typeof this.subscriptionResponseDTO](
              subscriptions as any,
              em
            ) // safe because of groupBy
          : this.defaultSubscriptionResponseDTO(subscriptions);

      responses.forEach(s => responseSubscriptions.set(s.id, s));
    }

    return subscriptions.map(s => responseSubscriptions.get(s.id)!);
  }

  private readonly subscriptionResponseDTO = {
    SUPPORT_UPDATED: this.supportUpdateResponseDTO.bind(this)
  };

  private defaultSubscriptionResponseDTO(subscriptions: NotifyMeSubscriptionEntity[]): DefaultResponseDTO[] {
    return subscriptions.map(s => ({
      id: s.id,
      updatedAt: s.updatedAt,
      eventType: s.eventType,
      subscriptionType: s.config.subscriptionType
      // config: s.config,
      // scheduledNotification: s.scheduledNotification
      //   ? {
      //       sendDate: s.scheduledNotification.sendDate,
      //       params: s.scheduledNotification.params
      //     }
      //   : undefined
    }));
  }

  private async supportUpdateResponseDTO(
    subscriptions: (NotifyMeSubscriptionEntity & { config: SupportUpdateCreated })[],
    em: EntityManager
  ): Promise<SupportUpdateResponseTypes['SUPPORT_UPDATED'][]> {
    const units = subscriptions.flatMap(s => s.config.preConditions.units);
    const retrievedUnits = new Map(
      (
        await em
          .createQueryBuilder(OrganisationUnitEntity, 'unit')
          .select(['unit.id', 'unit.name', 'unit.acronym', 'org.id', 'org.name', 'org.acronym'])
          .innerJoin('unit.organisation', 'org')
          .where('unit.id IN (:...unitIds)', { unitIds: units })
          .andWhere('unit.inactivatedAt IS NULL')
          .getMany()
      ).map(u => [u.id, u])
    );

    return subscriptions.map(s => ({
      id: s.id,
      updatedAt: s.updatedAt,
      eventType: s.config.eventType,
      subscriptionType: s.config.subscriptionType,
      organisations: this.groupUnitsByOrganisation(s.config.preConditions.units, retrievedUnits),
      status: s.config.preConditions.status
    }));
  }

  // receives a list of units and a map of unit ids to units with their organisations and returns the units grouped by organisation
  private groupUnitsByOrganisation(
    units: string[],
    retrievedUnits: Map<
      string,
      { id: string; name: string; acronym: string; organisation: { id: string; name: string; acronym: string | null } }
    >
  ): {
    id: string;
    name: string;
    acronym: string;
    units: {
      id: string;
      name: string;
      acronym: string;
    }[];
  }[] {
    const organisations = {} as Record<
      string,
      {
        id: string;
        name: string;
        acronym: string;
        units: {
          id: string;
          name: string;
          acronym: string;
        }[];
      }
    >;
    units.forEach(u => {
      const unit = retrievedUnits.get(u);
      if (!unit) return;
      if (!(unit.organisation.id in organisations)) {
        organisations[unit.organisation.id] = {
          id: unit.organisation.id,
          name: unit.organisation.name,
          acronym: unit.organisation.acronym ?? '',
          units: []
        };
      }
      organisations[unit.organisation.id]?.units.push({
        id: unit.id,
        name: unit.name,
        acronym: unit.acronym
      });
    });
    return Object.values(organisations);
  }

  async getNotifyMeSubscriptions(
    domainContext: DomainContextType,
    entityManager?: EntityManager
  ): Promise<{ innovationId: string; name: string; count: number }[]> {
    const em = entityManager ?? this.sqlConnection.manager;

    const query = em
      .createQueryBuilder(NotifyMeSubscriptionEntity, 'subscription')
      .select(['innovation.id as id', 'innovation.name as name', 'COUNT(subscription.id) as count'])
      .innerJoin('subscription.innovation', 'innovation')
      .where('subscription.user_role_id = :roleId', { roleId: domainContext.currentRole.id })
      .groupBy('innovation.id')
      .addGroupBy('innovation.name')
      .addOrderBy('innovation.name');

    if (isAccessorDomainContextType(domainContext)) {
      query
        .innerJoin('innovation.organisationShares', 'shares')
        .andWhere('shares.id = :orgId', { orgId: domainContext.organisation.id });
    }

    const subscriptions = await query.getRawMany();

    return subscriptions.map(s => ({
      innovationId: s.id,
      name: s.name,
      count: parseInt(s.count)
    }));
  }

  async updateSubscription(
    domainContext: DomainContextType,
    subscriptionId: string,
    config: SubscriptionConfig,
    entityManager?: EntityManager
  ): Promise<void> {
    const em = entityManager ?? this.sqlConnection.manager;

    const subscription = await em
      .createQueryBuilder(NotifyMeSubscriptionEntity, 'subscription')
      .select(['subscription.id', 'subscription.eventType'])
      .where('subscription.id = :subscriptionId', { subscriptionId })
      .andWhere('subscription.user_role_id = :roleId', { roleId: domainContext.currentRole.id })
      .getOne();

    if (!subscription) {
      throw new ForbiddenError(AuthErrorsEnum.AUTH_USER_ROLE_NOT_ALLOWED);
    }

    if (subscription.eventType !== config.eventType) {
      throw new BadRequestError(NotificationErrorsEnum.NOTIFY_ME_CANNOT_CHANGE_EVENT_TYPE);
    }

    await em.update(NotifyMeSubscriptionEntity, { id: subscriptionId }, { config });
  }

  async deleteSubscription(
    domainContext: DomainContextType,
    subscriptionId: string,
    entityManager?: EntityManager
  ): Promise<void> {
    if (!entityManager) {
      return this.sqlConnection.manager.transaction(t => {
        return this.deleteSubscription(domainContext, subscriptionId, t);
      });
    }

    const result = await entityManager.softDelete(NotifyMeSubscriptionEntity, {
      id: subscriptionId,
      userRole: { id: domainContext.currentRole.id }
    });

    if (result?.affected) {
      await entityManager.delete(NotificationScheduleEntity, { subscriptionId });
    }
  }
}
