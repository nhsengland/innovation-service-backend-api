import { NotificationEntity, NotificationPreferenceEntity, NotificationUserEntity } from '@users/shared/entities';
import { EmailNotificationPreferenceEnum, EmailNotificationTypeEnum, InnovationStatusEnum, NotificationContextDetailEnum, NotificationContextTypeEnum } from '@users/shared/enums';
import { GenericErrorsEnum, UnprocessableEntityError } from '@users/shared/errors';
import type { PaginationQueryParamsType } from '@users/shared/helpers';
import type { DateISOType } from '@users/shared/types';
import { injectable } from 'inversify';
import type { EntityManager } from 'typeorm';
import { BaseService } from './base.service';

@injectable()
export class NotificationsService extends BaseService {
  constructor() { super(); }

  /**
   * gets the user active notifications counters
   * @param userId the user id
   * @param entityManager optional entity manager to run the query (for transactions)
   * @returns the total
   */
  public async getUserActiveNotificationsCounter(userId: string, entityManager?: EntityManager): Promise<number> {
    const em = entityManager ?? this.sqlConnection.manager;

    const total = await em.createQueryBuilder(NotificationUserEntity, 'notificationUser')
      .innerJoin('notificationUser.notification', 'notification')
      .innerJoin('notification.innovation', 'innovation')             // fixes #104377
      .where('notificationUser.user = :id', { id: userId })
      .andWhere('notificationUser.readAt IS NULL')
      .getCount();
    return total;
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
    userId: string,
    filters: {
      contextTypes: NotificationContextTypeEnum[];
      unreadOnly: boolean;
    },
    pagination: PaginationQueryParamsType<'createdAt'>,
    entityManager?: EntityManager
  ): Promise<{total: number, data: {
    id: string;
    innovation: { id: string; name: string, status: InnovationStatusEnum };
    contextType: NotificationContextTypeEnum;
    contextDetail: NotificationContextDetailEnum;
    contextId: string;
    createdAt: DateISOType;
    readAt: DateISOType;
    params: Record<string, unknown>;
  }[]}> {
    const em = entityManager ?? this.sqlConnection.manager;

    const query = em.createQueryBuilder(NotificationUserEntity, 'user')
      .innerJoinAndSelect('user.notification', 'notification')
      .innerJoin('notification.innovation', 'innovation')
      .addSelect('innovation.id', 'innovation_id')
      .addSelect('innovation.status', 'innovation_status')
      .addSelect('innovation.name', 'innovation_name')
      .where('user.user = :userId', { userId: userId })

    // optional filters
    if (filters.unreadOnly) {
      query.andWhere('user.readAt IS NULL');
    }

    if (filters.contextTypes.length > 0) {
      query.andWhere('notification.contextType IN (:...contextTypes)', { contextTypes: filters.contextTypes });
    }
    
    // Pagination
    query.skip(pagination.skip);
    query.take(pagination.take);
    for (const [key, order] of Object.entries(pagination.order)) {
      let field: string;
      switch (key) {
        case 'createdAt': 
        default:
          field = 'notification.createdAt'; break;
      }
      query.addOrderBy(field, order);
    }

    const [notifications, count] = await query.getManyAndCount();

    return {
      total: count,
      data: notifications.map( n => ({
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
        params: JSON.parse(n.notification.params)
      }))
    };
  }

  /**
   * deletes a user notification
   * @param userId the user id
   * @param notificationId the notification id
   * @param entityManager optional entity manager to run the query (for transactions)
   */
  async deleteUserNotification(userId: string, notificationId: string, entityManager?: EntityManager): Promise<void> {
    const em = entityManager ?? this.sqlConnection.manager;

    await em.update(NotificationUserEntity, { user: userId, notification: notificationId }, { deletedAt: (new Date()).toISOString() });
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
    userId: string,
    conditions: {
      notificationIds: string[];
      contextIds: string[];
      contextTypes: NotificationContextTypeEnum[];
      dismissAll: boolean;
    },
    entityManager?: EntityManager
  ): Promise<number> {
    const em = entityManager ?? this.sqlConnection.manager;

    if ( !conditions.dismissAll && conditions.notificationIds.length === 0 && conditions.contextTypes.length === 0 && conditions.contextIds.length === 0) {
      throw new UnprocessableEntityError(GenericErrorsEnum.INVALID_PAYLOAD, { message: 'Either dismissAll is true or at least one of the following fields must have elements: notificationIds, contextTypes, contextIds'})
    }

    const params: { userId: string, notificationIds?: string[], contextIds?: string[], contextTypes?: string[] } = { userId: userId };
    const query = em.createQueryBuilder(NotificationUserEntity, 'user').update()
      .set({ readAt: new Date().toISOString() })
      .where('user_id = :userId')
      .andWhere('deleted_at IS NULL')
      .andWhere('read_at IS NULL');
      
    if(!conditions.dismissAll) {
      const notificationQuery = em.createQueryBuilder(NotificationEntity, 'notification')
        .innerJoin('notification.notificationUsers', 'user')
        .select('notification.id')
        .andWhere('user.id = :userId')
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

      query.andWhere('notification_id IN ( ' + notificationQuery.getQuery() + ' )')
    }

    const res = await query.setParameters(params).execute();
    return res.affected ?? 0;
  }

  /**
   * returns the user email notification preferences
   * @param userId the user id
   * @param entityManager optional entity manager to run the query (for transactions)
   * @returns array of notification types and preferences
   */
  async getUserEmailPreferences(userId: string, entityManager?: EntityManager) : Promise<{
    notificationType: EmailNotificationTypeEnum,
    preference: EmailNotificationPreferenceEnum
  }[]>{
    const em = entityManager ?? this.sqlConnection.manager;

    const userPreferences = await em.createQueryBuilder(NotificationPreferenceEntity, 'preference').where('preference.user = :userId', { userId: userId }).getMany();
    const userPreferencesMap = new Map(userPreferences.map(p => ([p.notification_id, p.preference])));
    return [
      {notificationType: EmailNotificationTypeEnum.ACTION, preference: userPreferencesMap.get(EmailNotificationTypeEnum.ACTION) ?? EmailNotificationPreferenceEnum.INSTANTLY},
      {notificationType: EmailNotificationTypeEnum.SUPPORT, preference: userPreferencesMap.get(EmailNotificationTypeEnum.SUPPORT) ?? EmailNotificationPreferenceEnum.INSTANTLY},
      {notificationType: EmailNotificationTypeEnum.COMMENT, preference: userPreferencesMap.get(EmailNotificationTypeEnum.COMMENT) ?? EmailNotificationPreferenceEnum.INSTANTLY},
    ];
  }

  /**
   * upserts the user email notification preferences
   * @param userId the user id
   * @param preferences the preferences array to upsert
   * @param entityManager optional entity manager to run the query (for transactions)
   */
  async upsertUserEmailPreferences(
    userId: string,
    preferences: {
      notificationType: EmailNotificationTypeEnum,
      preference: EmailNotificationPreferenceEnum
    }[],
    entityManager?: EntityManager
  ) : Promise<void> {
    const em = entityManager ?? this.sqlConnection.manager;
    const saveData = preferences.map(p => ({
      user: {id: userId},
      notification_id: p.notificationType,
      preference: p.preference,
      createdBy: userId,  // this is only for the first time as BaseEntity defines it as update: false
      updatedBy: userId
    }));
    await em.save(NotificationPreferenceEntity, saveData);
  }

}