import { injectable } from 'inversify';
import type { EntityManager } from 'typeorm';

import { NotificationEntity, NotificationPreferenceEntity, NotificationUserEntity } from '@users/shared/entities';
import {
  InnovationStatusEnum,
  NotificationCategoryType,
  NotificationDetailType,
  ServiceRoleEnum
} from '@users/shared/enums';
import { GenericErrorsEnum, NotImplementedError, UnprocessableEntityError } from '@users/shared/errors';
import type { PaginationQueryParamsType } from '@users/shared/helpers';
import {
  ANotificationCategories,
  INotificationCategories,
  NaNotificationCategories,
  QANotificationCategories,
  generatePreferencesObject,
  type DomainContextType,
  type NotificationPreferences,
  type Role2PreferencesType
} from '@users/shared/types';

import { BaseService } from './base.service';

@injectable()
export class NotificationsService extends BaseService {
  /**
   * gets the user active notifications counters
   * @param userId the user id
   * @param entityManager optional entity manager to run the query (for transactions)
   * @returns the total
   */
  public async getUserActiveNotificationsCounter(roleId: string, entityManager?: EntityManager): Promise<number> {
    const em = entityManager ?? this.sqlConnection.manager;

    const query = em
      .createQueryBuilder(NotificationUserEntity, 'notificationUser')
      .innerJoin('notificationUser.notification', 'notification')
      .where('notificationUser.user_role_id = :id', { id: roleId })
      .andWhere('notificationUser.readAt IS NULL');

    return await query.getCount();
  }

  /**
   * gets the user notifications
   * @param userId the user id
   * @param filters optional filters to apply
   * - contextTypes: the context types to filter by
   * - unreadOnly: if true, only returns the unread notifications
   * @param pagination the pagination params
   * @param entityManager optional entity manager to run the query (for transactions)
   * @returns the total and the notifications
   */
  public async getUserNotifications(
    domainContext: DomainContextType,
    filters: {
      contextTypes: NotificationCategoryType[];
      unreadOnly: boolean;
    },
    pagination: PaginationQueryParamsType<'createdAt'>,
    entityManager?: EntityManager
  ): Promise<{
    total: number;
    data: {
      id: string;
      innovation: { id: string; name: string; status: InnovationStatusEnum };
      contextType: NotificationCategoryType;
      contextDetail: NotificationDetailType;
      contextId: string;
      createdAt: Date;
      readAt: Date | null;
      params: Record<string, unknown>;
    }[];
  }> {
    const em = entityManager ?? this.sqlConnection.manager;

    /**
     * Query with withDeleted for the cases where the innovation was withdrawn
     * leftJoin on owner for the cases where the owner was deleted but we still want the notification
     */
    const query = em
      .createQueryBuilder(NotificationUserEntity, 'notificationUser')
      .innerJoin('notificationUser.notification', 'notification')
      .withDeleted()
      .innerJoin('notification.innovation', 'innovation')
      .leftJoin('innovation.owner', 'innovationOwner')
      .where('notificationUser.user_role_id = :roleId', { roleId: domainContext.currentRole.id })
      .andWhere('notificationUser.deleted_at IS NULL');

    // optional filters
    if (filters.unreadOnly) {
      query.andWhere('notificationUser.readAt IS NULL');
    }

    if (filters.contextTypes.length > 0) {
      query.andWhere('notification.contextType IN (:...contextTypes)', {
        contextTypes: filters.contextTypes
      });
    }

    // Pagination
    query.skip(pagination.skip);
    query.take(pagination.take);
    for (const [key, order] of Object.entries(pagination.order)) {
      let field: string;
      switch (key) {
        case 'createdAt':
        default:
          field = 'notification.createdAt';
          break;
      }
      query.addOrderBy(field, order);
    }

    // For some reason the the query builder requires the select in the end or it has issues with the select distinct generated by the pagination
    query.select([
      'notificationUser.id',
      'notificationUser.readAt',
      'innovationOwner.identityId',
      'innovationOwner.status',
      'notification.id',
      'notification.contextType',
      'notification.contextDetail',
      'notification.contextId',
      'notification.createdAt',
      'notification.params',
      'innovation.id',
      'innovation.status',
      'innovation.name'
    ]);

    const [notifications, count] = await query.getManyAndCount();

    return {
      total: count,
      data: notifications.map(n => ({
        id: n.notification.id,
        innovation: {
          id: n.notification.innovation.id,
          name: n.notification.innovation.name,
          status: n.notification.innovation.status
        },
        contextType: n.notification.contextType,
        contextDetail: n.notification.contextDetail,
        contextId: n.notification.contextId,
        createdAt: n.notification.createdAt,
        readAt: n.readAt,
        params: n.notification.params
      }))
    };
  }

  /**
   * deletes a user notification
   * @param userId the user id
   * @param notificationId the notification id
   * @param entityManager optional entity manager to run the query (for transactions)
   */
  async deleteUserNotification(roleId: string, notificationId: string, entityManager?: EntityManager): Promise<void> {
    const em = entityManager ?? this.sqlConnection.manager;

    await em.update(
      NotificationUserEntity,
      { userRole: roleId, notification: notificationId },
      { deletedAt: new Date().toISOString() }
    );
  }

  /**
   * dismisses the user notifications by the given conditions (cumulative)
   * @param userId the user id
   * @param conditions the conditions to apply
   * - notificationIds: the notification ids to dismiss
   * - contextIds: the context ids to dismiss
   * - contextTypes: the context types to dismiss
   * - dismissAll: if true, dismisses all the notifications
   * @param entityManager
   * @returns the number of affected rows
   */
  async dismissUserNotifications(
    domainContext: DomainContextType,
    conditions: {
      notificationIds: string[];
      contextIds: string[];
      contextTypes: NotificationCategoryType[];
      contextDetails: NotificationDetailType[];
      dismissAll: boolean;
    },
    entityManager?: EntityManager
  ): Promise<number> {
    const em = entityManager ?? this.sqlConnection.manager;

    if (
      !conditions.dismissAll &&
      conditions.notificationIds.length === 0 &&
      conditions.contextTypes.length === 0 &&
      conditions.contextDetails.length === 0 &&
      conditions.contextIds.length === 0
    ) {
      throw new UnprocessableEntityError(GenericErrorsEnum.INVALID_PAYLOAD, {
        message:
          'Either dismissAll is true or at least one of the following fields must have elements: notificationIds, contextTypes, contextDetails, contextIds'
      });
    }

    const params: {
      roleId: string;
      notificationIds?: string[];
      contextIds?: string[];
      contextTypes?: string[];
      contextDetails?: string[];
    } = { roleId: domainContext.currentRole.id };
    const query = em
      .createQueryBuilder(NotificationUserEntity, 'user')
      .update()
      .set({ readAt: new Date().toISOString() })
      .where('user_role_id = :roleId')
      .andWhere('deleted_at IS NULL')
      .andWhere('read_at IS NULL');

    if (!conditions.dismissAll) {
      const notificationQuery = em
        .createQueryBuilder(NotificationEntity, 'notification')
        .innerJoin('notification.notificationUsers', 'user')
        .select('notification.id')
        .andWhere('user.user_role_id = :roleId', { roleId: domainContext.currentRole.id })
        .andWhere('user.read_at IS NULL');

      if (conditions.notificationIds.length > 0) {
        notificationQuery.andWhere('notification.id IN (:...notificationIds)');
        params.notificationIds = conditions.notificationIds;
      }
      if (conditions.contextIds.length > 0) {
        notificationQuery.andWhere('notification.contextId IN (:...contextIds)');
        params.contextIds = conditions.contextIds;
      }
      if (conditions.contextTypes.length > 0) {
        notificationQuery.andWhere('notification.contextType IN (:...contextTypes)');
        params.contextTypes = conditions.contextTypes;
      }
      if (conditions.contextDetails.length > 0) {
        notificationQuery.andWhere('notification.contextDetail IN (:...contextDetails)');
        params.contextDetails = conditions.contextDetails;
      }

      query.andWhere('notification_id IN ( ' + notificationQuery.getQuery() + ' )');
    }

    const res = await query.setParameters(params).execute();
    return res.affected ?? 0;
  }

  /**
   * returns the user role email notification preferences
   * @param userRoleId the user role id
   * @param entityManager optional entity manager to run the query (for transactions)
   * @returns notification preferences of the user (resolves the default when the user didn't set his)
   */
  async getUserRoleEmailPreferences(
    domainContext: DomainContextType,
    entityManager?: EntityManager
  ): Promise<NotificationPreferences> {
    const em = entityManager ?? this.sqlConnection.manager;

    const userPreferences = await em
      .createQueryBuilder(NotificationPreferenceEntity, 'preference')
      .where('preference.user_role_id = :userRoleId', { userRoleId: domainContext.currentRole.id })
      .getOne();

    // Order and manage
    const preferences = this.getDefaultNotificationPreferences(domainContext.currentRole.role);
    if (userPreferences) {
      Object.keys(preferences).forEach((key: any) => {
        const category: keyof NotificationPreferences = key;
        if (userPreferences.preferences[category]) {
          preferences[category] = userPreferences.preferences[category];
        }
      });
    }

    return preferences;
  }

  /**
   * upserts the user email notification preferences
   * @param userId the user id
   * @param preferences the preferences array to upsert
   * @param entityManager optional entity manager to run the query (for transactions)
   */
  async upsertUserEmailPreferences(
    domainContext: DomainContextType,
    data: { preferences: NotificationPreferences },
    entityManager?: EntityManager
  ): Promise<void> {
    const em = entityManager ?? this.sqlConnection.manager;

    const dbPreference = await em
      .createQueryBuilder(NotificationPreferenceEntity, 'preference')
      .where('preference.userRoleId = :userRoleId', { userRoleId: domainContext.currentRole.id })
      .getCount();

    const now = new Date();
    await em.save(
      NotificationPreferenceEntity,
      NotificationPreferenceEntity.new({
        userRoleId: domainContext.currentRole.id,
        preferences: data.preferences,
        updatedBy: domainContext.id,
        updatedAt: now,
        ...(dbPreference === 0 && { createdBy: domainContext.id, createdAt: now })
      })
    );
  }

  private getDefaultNotificationPreferences(role: ServiceRoleEnum): NotificationPreferences {
    switch (role) {
      case ServiceRoleEnum.INNOVATOR:
        return generatePreferencesObject(INotificationCategories) as Role2PreferencesType<ServiceRoleEnum.INNOVATOR>;
      case ServiceRoleEnum.ACCESSOR:
        return generatePreferencesObject(ANotificationCategories) as Role2PreferencesType<ServiceRoleEnum.ACCESSOR>;
      case ServiceRoleEnum.ASSESSMENT:
        return generatePreferencesObject(NaNotificationCategories) as Role2PreferencesType<ServiceRoleEnum.ASSESSMENT>;
      case ServiceRoleEnum.QUALIFYING_ACCESSOR:
        return generatePreferencesObject(
          QANotificationCategories
        ) as Role2PreferencesType<ServiceRoleEnum.QUALIFYING_ACCESSOR>;
      default:
        throw new NotImplementedError(GenericErrorsEnum.NOT_IMPLEMENTED_ERROR);
    }
  }
}
