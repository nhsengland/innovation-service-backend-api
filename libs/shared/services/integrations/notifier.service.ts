import { inject, injectable } from 'inversify';

import { NotifierTypeEnum, ServiceRoleEnum } from '../../enums';
import type { AdminDomainContextType, DomainContextType, NotifierTemplatesType } from '../../types';

import SHARED_SYMBOLS from '../symbols';
import type { LoggerService } from './logger.service';
import { QueuesEnum, StorageQueueService } from './storage-queue.service';

// TechDebt: Allow for system domain_context (this might be a breaking change and require notifications typing). Keeping the 00000000-0000-0000-0000-000000000000 for now.
//           It used to be F4D75573-47CF-EC11-B656-0050F25A2AF6

// This should be reviewed in the future, notifications currently require a sender (additionally it used to be F4D75573-47CF-EC11-B656-0050F25A2AF6)
const SYSTEM_CRON_SENDER: AdminDomainContextType = {
  currentRole: { id: '00000000-0000-0000-0000-000000000000', role: ServiceRoleEnum.ADMIN },
  id: '00000000-0000-0000-0000-000000000000',
  identityId: '00000000-0000-0000-0000-000000000000'
};

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
