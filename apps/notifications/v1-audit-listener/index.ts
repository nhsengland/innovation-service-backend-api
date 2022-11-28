import { container } from '../_config';

import type { Context } from '@azure/functions';

import { JoiHelper } from '@notifications/shared/helpers';
import { AuditServiceSymbol, AuditServiceType } from '@notifications/shared/services';
import type { AuditEntry } from '@notifications/shared/services/integrations/audit.service';

import { AuditMessageEntry, MessageSchema } from './validation.schemas';


// TODO since this is not really a notification migrate this to another function app (events) when such a thing exists
class V1AuditListener {

  static async queueTrigger(
    context: Context,
    auditEntry: AuditEntry
  ): Promise<void> {
    context.log.info('AUDIT LISTENER: ', auditEntry);

    const auditService = container.get<AuditServiceType>(AuditServiceSymbol);
    try {

      const message = JoiHelper.Validate<AuditMessageEntry>(MessageSchema, auditEntry);

      await auditService.create({
        action: message.action,
        date: message.date,
        target: message.target,
        userId: message.user,
        ...message.functionName && {functionName: message.functionName},
        ...message.innovationId && {innovationId: message.innovationId},
        ...message.invocationId && {invocationId: message.invocationId},
        ...message.targetId && {targetId: message.targetId},
      });
      
      context.res = { done: true };
      return;

    } catch (error) {
      context.log.error('ERROR: Unexpected error while processing audit', error);
      throw error;
    }

  }

}

export default V1AuditListener.queueTrigger;
