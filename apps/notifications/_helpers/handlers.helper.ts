import type { Schema } from 'joi';

import type { NotifierTypeEnum } from '@notifications/shared/enums';
// import { GenericErrorsEnum, InternalServerError } from '@notifications/shared/errors';

import type { DomainContextType } from '@notifications/shared/types';
import { EmailTypeEnum, NOTIFICATIONS_CONFIG } from '../_config';
import type { BaseHandler } from '../_handlers/base.handler';
import type { Context } from '@azure/functions';

export class HandlersHelper {
  static async runHandler(
    //TODO: Add azure function context for logs
    requestUser: DomainContextType,
    action: NotifierTypeEnum,
    params: { [key: string]: any },
    azureContext: Context
  ): Promise<BaseHandler<NotifierTypeEnum, EmailTypeEnum, Record<string, unknown>>> {
    return new NOTIFICATIONS_CONFIG[action].handler(requestUser, params, azureContext).run();
  }

  static handlerJoiDefinition(action: NotifierTypeEnum): Schema {
    return NOTIFICATIONS_CONFIG[action].joiDefinition;
  }
}
