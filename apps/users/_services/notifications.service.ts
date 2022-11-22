import { NotificationUserEntity } from '@users/shared/entities';
import { injectable } from 'inversify';
import { BaseService } from './base.service';

@injectable()
export class NotificationsService extends BaseService {

  constructor() { super(); }

  /**
   * gets the user active notifications counters
   * @param identityId the user identity
   * @returns the total
   */
  public async getUserActiveNotificationsCounter(identityId: string): Promise<number> {
    const total = await this.sqlConnection.createQueryBuilder(NotificationUserEntity, 'notificationUser')
      .innerJoin('notificationUser.notification', 'notification')
      .innerJoin('notification.innovation', 'innovation')             // fixes #104377
      .where('notificationUser.user = :identityId', { identityId })
      .andWhere('notificationUser.readAt IS NULL')
      .getCount();
    return total;
  }
}