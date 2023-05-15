import type { Schema } from 'joi';

import type { NotifierTypeEnum } from '@notifications/shared/enums';
// import { GenericErrorsEnum, InternalServerError } from '@notifications/shared/errors';

import type { DomainContextType } from '@notifications/shared/types';
import { EmailTypeEnum, NOTIFICATIONS_CONFIG } from '../_config';
import type { BaseHandler } from '../_handlers/base.handler';

export class HandlersHelper {
  static async runHandler(
    // TODO: change requestUser => DomainContextType ; Add azure function context for logs
    requestUser: { id: string; identityId: string },
    action: NotifierTypeEnum,
    params: { [key: string]: any },
    domainContext?: DomainContextType
  ): Promise<BaseHandler<NotifierTypeEnum, EmailTypeEnum, Record<string, unknown>>> {
    return new NOTIFICATIONS_CONFIG[action].handler(requestUser, params, domainContext).run();
  }

  static handlerJoiDefinition(action: NotifierTypeEnum): Schema {
    return NOTIFICATIONS_CONFIG[action].joiDefinition;
  }
}
