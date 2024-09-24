import { container } from '../_config';

import type { Context } from '@azure/functions';

import { JoiHelper } from '@notifications/shared/helpers';
import type { AuditService } from '@notifications/shared/services';
import type { AuditEntry } from '@notifications/shared/services/integrations/audit.service';
import SHARED_SYMBOLS from '@notifications/shared/services/symbols';

import type { AuditMessageEntry} from './validation.schemas';
import { MessageSchema } from './validation.schemas';

// TODO since this is not really a notification migrate this to another function app (events) when such a thing exists
class V1AuditListener {
  static async queueTrigger(context: Context, auditEntry: AuditEntry): Promise<void> {
    context.log.info('AUDIT LISTENER: ', JSON.stringify(auditEntry));

    const auditService = container.get<AuditService>(SHARED_SYMBOLS.AuditService);
    try {
      const message = JoiHelper.Validate<AuditMessageEntry>(MessageSchema, auditEntry);

      await auditService.create({
        action: message.action,
        date: message.date,
        target: message.target,
        userId: message.user,
        ...(message.functionName && { functionName: message.functionName }),
        ...(message.innovationId && { innovationId: message.innovationId }),
        ...(message.invocationId && { invocationId: message.invocationId }),
        ...(message.targetId && { targetId: message.targetId })
      });

      context.res = { done: true };
      return;
    } catch (error) {
      context.log.error('ERROR: Unexpected error while processing audit:', JSON.stringify(error));
      throw error;
    }
  }
}

export default V1AuditListener.queueTrigger;
