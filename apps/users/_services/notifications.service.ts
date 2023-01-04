import { NotificationUserEntity } from '@users/shared/entities';
import type { InnovationStatusEnum, NotificationContextDetailEnum, NotificationContextTypeEnum } from '@users/shared/enums';
import type { PaginationQueryParamsType } from '@users/shared/helpers';
import type { DateISOType } from '@users/shared/types';
import { injectable } from 'inversify';
import { BaseService } from './base.service';

@injectable()
export class NotificationsService extends BaseService {

  constructor() { super(); }

  /**
   * gets the user active notifications counters
   * @param id the user id
   * @returns the total
   */
  public async getUserActiveNotificationsCounter(id: string): Promise<number> {
    const total = await this.sqlConnection.createQueryBuilder(NotificationUserEntity, 'notificationUser')
      .innerJoin('notificationUser.notification', 'notification')
      .innerJoin('notification.innovation', 'innovation')             // fixes #104377
      .where('notificationUser.user = :id', { id })
      .andWhere('notificationUser.readAt IS NULL')
      .getCount();
    return total;
  }


  public async getUserNotifications(
    id: string,
    filters: {
      contextTypes: NotificationContextTypeEnum[];
      unreadOnly: boolean;
    },
    pagination: PaginationQueryParamsType<'createdAt'>
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
    const query = this.sqlConnection.createQueryBuilder(NotificationUserEntity, 'user')
      .innerJoinAndSelect('user.notification', 'notification')
      .innerJoin('notification.innovation', 'innovation')
      .addSelect('innovation.id', 'innovation_id')
      .addSelect('innovation.status', 'innovation_status')
      .addSelect('innovation.name', 'innovation_name')
      .where('user.user = :userId', { userId: id })

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
}