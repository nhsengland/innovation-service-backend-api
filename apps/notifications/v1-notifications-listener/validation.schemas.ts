import Joi from 'joi';

import { NotifierTypeEnum, UserTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType } from '@notifications/shared/types';


export type MessageType = {
  data: {
    requestUser: { id: string, identityId: string, type: UserTypeEnum },
    action: NotifierTypeEnum,
    params: { [key: string]: any },
    domainContext?: DomainContextType,
  }
}

export const MessageSchema = Joi.object<MessageType>({

  data: Joi.object<MessageType['data']>({

    requestUser: Joi.object<MessageType['data']['requestUser']>({
      id: Joi.string().guid().required(),
      identityId: Joi.string().guid().required(),
      type: Joi.string().valid(...Object.values(UserTypeEnum)).required()
    }).required(),

    action: Joi.string().valid(...Object.values(NotifierTypeEnum)).required(),

    params: Joi.object().required(),
    domainContext: Joi.object<DomainContextType>().optional(),

  }).required()

}).required();
