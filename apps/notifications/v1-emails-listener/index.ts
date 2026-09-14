import type { Context } from '@azure/functions';

import { getExponentialBackoffMs, JoiHelper } from '@notifications/shared/helpers';
import type { StorageQueueService } from '@notifications/shared/services';
import { QueuesEnum } from '@notifications/shared/services/integrations/storage-queue.service';
import SHARED_SYMBOLS from '@notifications/shared/services/symbols';

import type { EmailTemplates } from '../_config';
import { container } from '../_config';

import type { DispatchService } from '../_services/dispatch.service';
import { NotifyDeliveryError } from '../_services/email.service';
import SYMBOLS from '../_services/symbols';
import type { MessageType } from './validation.schemas';
import { MessageSchema } from './validation.schemas';

const MAX_EMAIL_ATTEMPTS = 10;
const MAX_FALLBACK_RETRY_DELAY_MS = 1 * 60 * 60 * 1000;

class V1SendEmailListener {
  static async queueTrigger(
    context: Context,
    requestMessage: {
      attempt?: number;
      data: {
        type: keyof EmailTemplates;
        to: string;
        params: { [key: string]: string | number };
      };
    }
  ): Promise<void> {
    let message: MessageType | undefined;
    let storageQueueService: StorageQueueService | undefined;
    let attempt = 1;

    context.log.info('EMAIL LISTENER: ', JSON.stringify(requestMessage));

    try {
      const dispatchService = container.get<DispatchService>(SYMBOLS.DispatchService);
      storageQueueService = container.get<StorageQueueService>(SHARED_SYMBOLS.StorageQueueService);
      message = JoiHelper.Validate<MessageType>(MessageSchema, requestMessage);
      attempt = message.attempt ?? 1;

      await dispatchService.sendEmail(message.data.type, message.data.to, message.data.params);

      context.res = { done: true };
      return;
    } catch (error) {
      await V1SendEmailListener.handleEmailError(context, error, message, attempt, storageQueueService);
      return;
    }
  }

  private static async handleEmailError(
    context: Context,
    error: unknown,
    message: MessageType | undefined,
    attempt: number,
    storageQueueService: StorageQueueService | undefined
  ): Promise<void> {
    if (message && storageQueueService && error instanceof NotifyDeliveryError) {
      if (error.retryable && attempt < MAX_EMAIL_ATTEMPTS) {
        const retryScheduled = await V1SendEmailListener.scheduleEmailRetry(
          context,
          storageQueueService,
          message,
          attempt,
          error
        );
        if (retryScheduled) {
          return;
        }
      }
    }

    context.log.error('EMAIL LISTENER: Email delivery failed; message removed after logging', {
      to: message?.data.to,
      attempt,
      status: error instanceof NotifyDeliveryError ? error.status : undefined,
      error
    });
  }

  private static async scheduleEmailRetry(
    context: Context,
    storageQueueService: StorageQueueService,
    message: MessageType,
    attempt: number,
    error: NotifyDeliveryError
  ): Promise<boolean> {
    const delayMs =
      error.retryAfterMs ?? getExponentialBackoffMs(Math.max(0, attempt - 1), MAX_FALLBACK_RETRY_DELAY_MS);

    try {
      await storageQueueService.sendMessage<MessageType>(
        QueuesEnum.EMAIL,
        { ...message, attempt: attempt + 1 },
        { visibilityTimeout: Math.max(1, Math.ceil(delayMs / 1000)) }
      );
    } catch (requeueError) {
      context.log.error('EMAIL LISTENER: Could not schedule email retry', {
        to: message.data.to,
        attempt,
        error: requeueError
      });
      return false;
    }

    context.log.error('EMAIL LISTENER: Email delivery failed; retry scheduled', {
      to: message.data.to,
      attempt,
      delayMs,
      status: error.status
    });
    return true;
  }
}

export default V1SendEmailListener.queueTrigger;
