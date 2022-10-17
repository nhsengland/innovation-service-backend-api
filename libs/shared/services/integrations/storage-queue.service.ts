import { injectable } from 'inversify';
import { QueueClient, QueueSendMessageOptions, QueueSendMessageResponse, QueueServiceClient } from '@azure/storage-queue';

import { STORAGE_QUEUE_CONFIG } from '../../config';


export enum QueuesEnum {
  EMAIL = 'email-send-queue',
  NOTIFICATION = 'notification-queue',
  IN_APP = 'in-app-send-queue'
}


@injectable()
export class StorageQueueService {

  private queueClient: QueueClient;
  private queueServiceClient: QueueServiceClient;

  private async init(queueName: QueuesEnum): Promise<void> {

    this.queueServiceClient = QueueServiceClient.fromConnectionString(STORAGE_QUEUE_CONFIG.storageConnectionString);

    // const sharedCredentials = new StorageSharedKeyCredential(
    //   process.env.QUEUE_ACCOUNT_NAME as string,
    //   process.env.QUEUE_ACCOUNT_KEY as string,
    // );
    //this.queueServiceClient = new QueueServiceClient(process.env.QUEUE_BASE_URL as string, sharedCredentials, { retryOptions: { maxTries: 4 }});

    this.queueClient = this.queueServiceClient.getQueueClient(queueName);

    await this.queueClient.createIfNotExists();

  }

  async sendMessage(queueName: QueuesEnum, message: { [key: string]: any }, options?: QueueSendMessageOptions): Promise<QueueSendMessageResponse> {

    await this.init(queueName);

    const payload = JSON.stringify(message);

    return this.queueClient.sendMessage(Buffer.from(payload).toString('base64'), options);

  }

  // async receiveMessage(count: number = 1, queueName?: string): Promise<{ [key: string]: any } | undefined> {

  //   this.init(queueName);

  //   const messages = await this.queueClient.receiveMessages({ numberOfMessages: 1, visibilityTimeout: 60 * 3600 });
  //   const message = messages.receivedMessageItems.find(x => true);

  //   if (message) {
  //     const payload = JSON.parse(message.messageText);

  //     await this.queueClient.deleteMessage(message.messageId, message.popReceipt);
  //     return payload;
  //   }

  //   return;

  // }

}
