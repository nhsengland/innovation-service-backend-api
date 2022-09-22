import { inject, injectable } from 'inversify';

import {
  LoggerServiceSymbol, LoggerServiceType,
  StorageQueueServiceSymbol, StorageQueueServiceType
} from '../../interfaces/services.interfaces';
import { QueuesEnum } from './storage-queue.service';

import type { NotifierTemplatesType, NotifierTypeEnum } from '../../config/notifier.config';
import type { UserTypeEnum } from '../../enums/user.enums';


@injectable()
export class NotifierService {

  constructor(
    @inject(LoggerServiceSymbol) private loggerService: LoggerServiceType,
    @inject(StorageQueueServiceSymbol) private storageQueueService: StorageQueueServiceType
  ) { }


  async send<T extends NotifierTypeEnum>( // This typing strategy, validades the correct properties for the supplied notifierType.
    requestUser: { id: string, identityId: string, type: UserTypeEnum },
    notifierType: T,
    params: NotifierTemplatesType[T]
  ): Promise<boolean> {

    try {

      this.storageQueueService.sendMessage(QueuesEnum.NOTIFICATION, {
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

}
