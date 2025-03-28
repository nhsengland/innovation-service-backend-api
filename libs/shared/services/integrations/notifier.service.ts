import { inject, injectable } from 'inversify';

import { NotifierTypeEnum } from '../../enums';
import type { DomainContextType, EventPayloads, NotifierTemplatesType, NotifyMeMessageType } from '../../types';

import type { EventType } from '@notifications/shared/types';
import { SYSTEM_CONTEXT } from '../../constants';
import SHARED_SYMBOLS from '../symbols';
import type { LoggerService } from './logger.service';
import { QueuesEnum, StorageQueueService } from './storage-queue.service';

// This should be reviewed in the future, notifications currently require a sender (additionally it used to be F4D75573-47CF-EC11-B656-0050F25A2AF6)
export const SYSTEM_CRON_SENDER = SYSTEM_CONTEXT;

@injectable()
export class NotifierService {
  constructor(
    @inject(SHARED_SYMBOLS.LoggerService) private loggerService: LoggerService,
    @inject(SHARED_SYMBOLS.StorageQueueService) private storageQueueService: StorageQueueService
  ) {}

  async send<T extends NotifierTypeEnum>( // This typing strategy, validates the correct properties for the supplied notifierType.
    requestUser: DomainContextType,
    notifierType: T,
    params: NotifierTemplatesType[T]
  ): Promise<boolean> {
    try {
      await this.storageQueueService.sendMessage(QueuesEnum.NOTIFICATION, {
        data: {
          requestUser,
          action: notifierType,
          params
        }
      });

      this.loggerService.log(`Notification sent`, { type: notifierType, params });
    } catch (error) {
      // TODO: What to return here? should we give an error to the user? Throw an error?
      this.loggerService.error('Error sending notification', error);
      return false;
    }

    return true;
  }

  async sendNotifyMe<T extends EventType>(
    requestUser: DomainContextType,
    innovationId: string,
    type: T,
    params: EventPayloads[T]
  ): Promise<boolean> {
    try {
      await this.storageQueueService.sendMessage<NotifyMeMessageType<T>>(QueuesEnum.NOTIFY_ME, {
        data: {
          requestUser,
          innovationId,
          type,
          params
        }
      });

      this.loggerService.log(`Notify Me sent`, { type, params });
    } catch (error) {
      this.loggerService.error('Error sending notification', error);
      return false;
    }
    return true;
  }

  /**
   * envelope function for sending system notifications. Currently it uses the SYSTEM_CRON_SENDER but this should be reviewd
   * @param notifierType the notifier type
   * @param params the notification parameters
   * @returns true if the notification was sent
   */
  async sendSystemNotification<T extends NotifierTypeEnum>(
    notifierType: T,
    params: NotifierTemplatesType[T]
  ): Promise<boolean> {
    return this.send(SYSTEM_CRON_SENDER, notifierType, params);
  }
}
