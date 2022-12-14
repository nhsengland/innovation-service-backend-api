import { inject, injectable } from 'inversify';
import type { IdentityOperationsTemplatesType } from 'libs/shared/types/identity-operations.type';

import type { IdentityOperationsTypeEnum } from '../../enums';

import { LoggerServiceSymbol, LoggerServiceType, StorageQueueServiceSymbol, StorageQueueServiceType } from '../interfaces';
import { QueuesEnum } from './storage-queue.service';


@injectable()
export class IdentityOperationsQueueService {

  constructor(
    @inject(LoggerServiceSymbol) private loggerService: LoggerServiceType,
    @inject(StorageQueueServiceSymbol) private storageQueueService: StorageQueueServiceType
  ) { }


  async sendToQueue<T extends IdentityOperationsTypeEnum>(
    // requestUser: { id: string, identityId: string, type: UserTypeEnum },
    operationType: T,
    params: IdentityOperationsTemplatesType[T]
  ): Promise<boolean> {

    try {

      await this.storageQueueService.sendMessage(QueuesEnum.IDENTITY, {
        data: {
          // requestUser: {id: requestUser.id, identityId: requestUser.identityId, type: requestUser.type},
          type: operationType,
          ...params
        }
      });

      this.loggerService.log(`Identity operation sent to queue`, { type: operationType, params });

    } catch (error) {

      this.loggerService.error('Error sending identity operation to queue', error);

    }

    return true;

  }

}
