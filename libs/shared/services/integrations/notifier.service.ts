import { inject, injectable } from 'inversify';

import type { NotifierTypeEnum } from '../../enums';
import type { DomainContextType, NotifierTemplatesType } from '../../types';

import {
  LoggerServiceSymbol,
  LoggerServiceType,
  StorageQueueServiceSymbol,
  StorageQueueServiceType,
} from '../interfaces';
import { QueuesEnum } from './storage-queue.service';

@injectable()
export class NotifierService {
  constructor(
    @inject(LoggerServiceSymbol) private loggerService: LoggerServiceType,
    @inject(StorageQueueServiceSymbol) private storageQueueService: StorageQueueServiceType
  ) {}

  async send<T extends NotifierTypeEnum>( // This typing strategy, validades the correct properties for the supplied notifierType.
    requestUser: { id: string; identityId: string },
    notifierType: T,
    params: NotifierTemplatesType[T],
    domainContext: DomainContextType
  ): Promise<boolean> {
    try {
      await this.storageQueueService.sendMessage(QueuesEnum.NOTIFICATION, {
        data: {
          requestUser: { id: requestUser.id, identityId: requestUser.identityId },
          action: notifierType,
          params,
          domainContext,
        },
      });

      this.loggerService.log(`Notification sent`, { type: notifierType, params });
    } catch (error) {
      // TODO: What to return here? should we give an error to the user? Throw an error?
      this.loggerService.error('Error sending notification', error);
    }

    return true;
  }
}
