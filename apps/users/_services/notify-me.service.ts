import { injectable } from 'inversify';
import { groupBy, pick } from 'lodash';
import { In, type EntityManager } from 'typeorm';

import {
  InnovationEntity,
  NotificationScheduleEntity,
  NotifyMeSubscriptionEntity,
  OrganisationUnitEntity,
  UserRoleEntity
} from '@users/shared/entities';
import { BadRequestError, ForbiddenError, NotFoundError, NotImplementedError } from '@users/shared/errors';
import { NotificationErrorsEnum } from '@users/shared/errors/errors.enums';
import { AuthErrorsEnum } from '@users/shared/services/auth/authorization-validation.model';
import {
  isAccessorDomainContextType,
  type DomainContextType,
  type EventType,
  type ProgressUpdateCreated,
  type SubscriptionConfig,
  type SupportUpdated
} from '@users/shared/types';
import type {
  DefaultOptions,
  DefaultResponseDTO,
  EntitySubscriptionConfigType,
  NotifyMeResponseTypes,
  OrganisationWithUnits,
  SubscriptionResponseDTO
} from '../_types/notify-me.types';
import { BaseService } from './base.service';

@injectable()
export class NotifyMeService extends BaseService {
  constructor() {
    super();
  }

  async createSubscription(
    domainContext: DomainContextType,
    innovationId: string,
    config: SubscriptionConfig,
    entityManager?: EntityManager
  ): Promise<void> {
    if (config.subscriptionType === 'SCHEDULED' && config.date < new Date()) {
      throw new BadRequestError(NotificationErrorsEnum.NOTIFY_ME_SCHEDULED_DATE_PAST);
    }

    const em = entityManager ?? this.sqlConnection.manager;

    const subscription = await em.save(
      NotifyMeSubscriptionEntity,
      NotifyMeSubscriptionEntity.new({
        createdBy: domainContext.id,
        config: config,
        userRole: UserRoleEntity.new({ id: domainContext.currentRole.id }),
        innovation: InnovationEntity.new({ id: innovationId })
      })
    );

    if (config.subscriptionType === 'SCHEDULED') {
      await em.save(NotificationScheduleEntity, {
        subscriptionId: subscription.id,
        sendDate: config.date
      });
    }
  }

  async getInnovationSubscriptions(
    domainContext: DomainContextType,
    innovationId: string,
    entityManager?: EntityManager
  ): Promise<SubscriptionResponseDTO[]> {
    const em = entityManager ?? this.sqlConnection.manager;

    const query = em
      .createQueryBuilder(NotifyMeSubscriptionEntity, 'subscription')
      .select(['subscription.id', 'subscription.eventType', 'subscription.config', 'subscription.updatedAt'])
      .where('subscription.user_role_id = :roleId', { roleId: domainContext.currentRole.id })
      .andWhere('subscription.innovation_id = :innovationId', { innovationId: innovationId })
      .andWhere("subscription.subscriptionType != 'ONCE'") // at least for now once subscriptions should be hidden
      .orderBy('subscription.updatedAt', 'DESC');

    const subscriptions = await query.getMany();
    const groupedSubscriptions = groupBy(subscriptions, 'eventType');

    // Map of subscription ids to their DTOs
    const responseSubscriptions = new Map<string, SubscriptionResponseDTO>();
    for (const [eventType, subscriptions] of Object.entries(groupedSubscriptions)) {
      if (!(eventType in this.subscriptionResponseDTO)) {
        throw new NotImplementedError(NotificationErrorsEnum.NOTIFY_ME_SUBSCRIPTION_TYPE_NOT_FOUND, {
          details: { eventType }
        });
      }
      const responses = await this.subscriptionResponseDTO[
        eventType as keyof NotifyMeService['subscriptionResponseDTO']
      ](
        subscriptions as any, // safe because of groupBy
        em
      );
      responses.forEach(s => responseSubscriptions.set(s.id, s));
    }

    return subscriptions.map(s => responseSubscriptions.get(s.id)!);
  }

  private readonly subscriptionResponseDTO = {
    SUPPORT_UPDATED: this.supportUpdateResponseDTO.bind(this),
    PROGRESS_UPDATE_CREATED: this.progressUpdateCreatedResponseDTO.bind(this),
    INNOVATION_RECORD_UPDATED: this.defaultSubscriptionResponseDTO('INNOVATION_RECORD_UPDATED', ['sections']).bind(
      this
    ),
    DOCUMENT_UPLOADED: this.defaultSubscriptionResponseDTO('DOCUMENT_UPLOADED', []).bind(this),
    REMINDER: this.defaultSubscriptionResponseDTO('REMINDER', ['date', 'customMessage']).bind(this)
  };

  private defaultSubscriptionResponseDTO<T extends EventType, K extends DefaultOptions<T>>(
    type: T | undefined,
    keys: K[]
  ): (subscriptions: EntitySubscriptionConfigType<T>[]) => DefaultResponseDTO<T, K>[] {
    return (subscriptions: EntitySubscriptionConfigType<T>[]) => {
      return subscriptions.map(s => ({
        id: s.id,
        updatedAt: s.updatedAt,
        eventType: type,
        subscriptionType: s.config.subscriptionType,
        ...(keys.length && pick(s.config, keys)),
        ...(keys.length && pick('preConditions' in s.config && s.config.preConditions, keys))
      })) as DefaultResponseDTO<T, K>[];
    };
  }

  private async supportUpdateResponseDTO(
    subscriptions: (NotifyMeSubscriptionEntity & { config: SupportUpdated })[],
    em: EntityManager
  ): Promise<NotifyMeResponseTypes['SUPPORT_UPDATED'][]> {
    const retrievedUnits = await this.getUnitsMap(
      subscriptions.flatMap(s => s.config.preConditions.units),
      em
    );

    return subscriptions.map(s => ({
      id: s.id,
      updatedAt: s.updatedAt,
      eventType: s.config.eventType,
      subscriptionType: s.config.subscriptionType,
      organisations: this.groupUnitsByOrganisation(s.config.preConditions.units, retrievedUnits),
      status: s.config.preConditions.status,
      notificationType: s.config.notificationType
    }));
  }

  private async progressUpdateCreatedResponseDTO(
    subscriptions: (NotifyMeSubscriptionEntity & { config: ProgressUpdateCreated })[],
    em: EntityManager
  ): Promise<NotifyMeResponseTypes['PROGRESS_UPDATE_CREATED'][]> {
    const retrievedUnits = await this.getUnitsMap(
      subscriptions.flatMap(s => s.config.preConditions.units),
      em
    );

    return subscriptions.map(s => ({
      id: s.id,
      updatedAt: s.updatedAt,
      eventType: s.config.eventType,
      subscriptionType: s.config.subscriptionType,
      organisations: this.groupUnitsByOrganisation(s.config.preConditions.units, retrievedUnits)
    }));
  }

  // receives a list of units and a map of unit ids to units with their organisations and returns the units grouped by organisation
  private groupUnitsByOrganisation(
    units: string[],
    retrievedUnits: Map<
      string,
      {
        id: string;
        name: string;
        acronym: string;
        isShadow: boolean;
        organisation: { id: string; name: string; acronym: string | null };
      }
    >
  ): OrganisationWithUnits[] {
    const organisations = {} as Record<string, OrganisationWithUnits>;
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
        acronym: unit.acronym,
        isShadow: unit.isShadow
      });
    });
    return Object.values(organisations);
  }

  private async getUnitsMap(units: string[], em: EntityManager): Promise<Map<string, OrganisationUnitEntity>> {
    return new Map(
      (
        await em
          .createQueryBuilder(OrganisationUnitEntity, 'unit')
          .select(['unit.id', 'unit.name', 'unit.acronym', 'unit.isShadow', 'org.id', 'org.name', 'org.acronym'])
          .innerJoin('unit.organisation', 'org')
          .where('unit.id IN (:...unitIds)', { unitIds: units })
          .andWhere('unit.inactivatedAt IS NULL')
          .getMany()
      ).map(u => [u.id, u])
    );
  }

  async getSubscription(
    domainContext: DomainContextType,
    subscriptionId: string,
    entityManager?: EntityManager
  ): Promise<SubscriptionResponseDTO> {
    const em = entityManager ?? this.sqlConnection.manager;

    const subscription = await em
      .createQueryBuilder(NotifyMeSubscriptionEntity, 'subscription')
      .select(['subscription.id', 'subscription.eventType', 'subscription.config', 'subscription.updatedAt'])
      .where('subscription.id = :subscriptionId', { subscriptionId })
      .andWhere('subscription.user_role_id = :roleId', { roleId: domainContext.currentRole.id })
      .getOne();

    if (!subscription) {
      throw new NotFoundError(NotificationErrorsEnum.NOTIFY_ME_SUBSCRIPTION_NOT_FOUND);
    }

    if (!(subscription.eventType in this.subscriptionResponseDTO)) {
      throw new NotImplementedError(NotificationErrorsEnum.NOTIFY_ME_SUBSCRIPTION_TYPE_NOT_FOUND, {
        details: { eventType: subscription.eventType }
      });
    }

    const response = await this.subscriptionResponseDTO[
      subscription.eventType as keyof NotifyMeService['subscriptionResponseDTO']
    ]([subscription as any], em);

    // never happens but failsafe
    if (!response[0]) {
      throw new NotFoundError(NotificationErrorsEnum.NOTIFY_ME_SUBSCRIPTION_NOT_FOUND);
    }
    return response[0];
  }

  async getNotifyMeSubscriptions(
    domainContext: DomainContextType,
    withDetails = false,
    entityManager?: EntityManager
  ): Promise<{ innovationId: string; name: string; count: number }[]> {
    const em = entityManager ?? this.sqlConnection.manager;

    const query = em
      .createQueryBuilder(NotifyMeSubscriptionEntity, 'subscription')
      .select(['innovation.id as id', 'innovation.name as name', 'COUNT(subscription.id) as count'])
      .innerJoin('subscription.innovation', 'innovation')
      .where('subscription.user_role_id = :roleId', { roleId: domainContext.currentRole.id })
      .andWhere("subscription.subscriptionType != 'ONCE'") // at least for now once subscriptions should be hidden
      .groupBy('innovation.id')
      .addGroupBy('innovation.name')
      .addOrderBy('innovation.name');

    if (withDetails) {
      query.addSelect(`JSON_QUERY((
        SELECT id, event_type as eventType, subscription_type as subscriptionType, JSON_QUERY(config) as config, updated_at as updatedAt
        FROM notify_me_subscription
        WHERE innovation_id=innovation.id
        AND user_role_id=:roleId
        AND deleted_at IS NULL
        AND subscription_type != 'ONCE'
        ORDER BY updated_at DESC
        FOR JSON AUTO)) as subscriptions`);
    }

    if (isAccessorDomainContextType(domainContext)) {
      query
        .innerJoin('innovation.organisationShares', 'shares')
        .andWhere('shares.id = :orgId', { orgId: domainContext.organisation.id });
    }

    const subscriptions = await query.getRawMany();

    const responseSubscriptions = new Map<string, SubscriptionResponseDTO>();
    if (withDetails) {
      // Convert subscriptions text from SQL into object
      subscriptions.forEach(s => {
        s.subscriptions = JSON.parse(s.subscriptions).map((s: any) => ({ ...s, updatedAt: new Date(s.updatedAt) }));
      });

      const allSubscriptions = subscriptions.flatMap(s => s.subscriptions);
      const groupedSubscriptions = groupBy(allSubscriptions, 'eventType');

      // Map of subscription ids to their DTOs
      for (const [eventType, subscriptions] of Object.entries(groupedSubscriptions)) {
        if (!(eventType in this.subscriptionResponseDTO)) {
          throw new NotImplementedError(NotificationErrorsEnum.NOTIFY_ME_SUBSCRIPTION_TYPE_NOT_FOUND, {
            details: { eventType }
          });
        }
        const responses = await this.subscriptionResponseDTO[
          eventType as keyof NotifyMeService['subscriptionResponseDTO']
        ](subscriptions as any, em); // safe because of groupBy

        responses.forEach(s => responseSubscriptions.set(s.id, s));
      }
    }

    return subscriptions.map(s => ({
      innovationId: s.id,
      name: s.name,
      count: parseInt(s.count),
      ...(withDetails && { subscriptions: s.subscriptions.map((s: any) => responseSubscriptions.get(s.id)) })
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

    if (config.subscriptionType === 'SCHEDULED' && config.date < new Date()) {
      throw new BadRequestError(NotificationErrorsEnum.NOTIFY_ME_SCHEDULED_DATE_PAST);
    }

    await em.update(NotifyMeSubscriptionEntity, { id: subscriptionId }, { config });

    if (config.subscriptionType === 'SCHEDULED') {
      await em.save(NotificationScheduleEntity, {
        subscriptionId: subscription.id,
        sendDate: config.date
      });
    }
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

  async deleteSubscriptions(
    domainContext: DomainContextType,
    ids?: string[],
    entityManager?: EntityManager
  ): Promise<void> {
    if (!entityManager) {
      return this.sqlConnection.manager.transaction(t => {
        return this.deleteSubscriptions(domainContext, ids, t);
      });
    }

    const query = entityManager.createQueryBuilder(NotificationScheduleEntity, 'scheduled').delete().where(
      // Delete only if the subscription belongs to the current user
      'EXISTS (SELECT 1 FROM notify_me_subscription WHERE id = notification_schedule.subscription_id AND user_role_id = :roleId)',
      { roleId: domainContext.currentRole.id }
    );

    if (ids?.length) {
      query.andWhere('notification_schedule.subscription_id IN (:...ids)', { ids });
    }

    await query.execute();

    await entityManager.softDelete(NotifyMeSubscriptionEntity, {
      userRole: { id: domainContext.currentRole.id },
      ...(ids?.length && { id: In(ids) })
    });
  }
}
