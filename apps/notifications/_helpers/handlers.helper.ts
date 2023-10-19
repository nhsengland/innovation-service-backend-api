import type { Schema } from 'joi';

import type { NotifierTypeEnum } from '@notifications/shared/enums';
// import { GenericErrorsEnum, InternalServerError } from '@notifications/shared/errors';

import type { Context } from '@azure/functions';
import type { DomainContextType } from '@notifications/shared/types';
import { NOTIFICATIONS_CONFIG } from '../_config';
import type { BaseHandler } from '../_handlers/base.handler';

export class HandlersHelper {
  static async runHandler(
    //TODO: Add azure function context for logs
    requestUser: DomainContextType,
    action: NotifierTypeEnum,
    params: any, // TODO: Add type, issues with the Record<string, never> from the recurrent notifications
    azureContext: Context
  ): Promise<BaseHandler<NotifierTypeEnum, any>> {
    return new NOTIFICATIONS_CONFIG[action].handler(requestUser, params, azureContext).run();
  }

  static handlerJoiDefinition(action: NotifierTypeEnum): Schema {
    return NOTIFICATIONS_CONFIG[action].joiDefinition;
  }
}
