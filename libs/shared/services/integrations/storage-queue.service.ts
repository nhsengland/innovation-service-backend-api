import {
  QueueClient,
  QueueSendMessageOptions,
  QueueSendMessageResponse,
  QueueServiceClient
} from '@azure/storage-queue';
import { injectable } from 'inversify';

import { STORAGE_QUEUE_CONFIG } from '../../config/storage-queue.config';

export enum QueuesEnum {
  AUDIT = 'audit-send-queue',
  EMAIL = 'email-send-queue',
  IDENTITY = 'identity-ops-queue',
  IN_APP = 'in-app-send-queue',
  NOTIFICATION = 'notification-queue',
  NOTIFY_ME = 'notify-me-queue',
  ELASTIC_SEARCH = 'elasticsearch-queue'
}

@injectable()
export class StorageQueueService {
  private queueServiceClient: QueueServiceClient = QueueServiceClient.fromConnectionString(
    STORAGE_QUEUE_CONFIG.storageConnectionString
  );

  private async init(queueName: QueuesEnum): Promise<QueueClient> {
    const queueClient = this.queueServiceClient.getQueueClient(queueName);

    await queueClient.createIfNotExists();
    return queueClient;
  }

  async sendMessage<T = any>(
    queueName: QueuesEnum,
    message: T,
    options?: QueueSendMessageOptions
  ): Promise<QueueSendMessageResponse> {
    const queueClient = await this.init(queueName);
    const payload = JSON.stringify(message);

    return queueClient.sendMessage(Buffer.from(payload).toString('base64'), options);
  }
}
