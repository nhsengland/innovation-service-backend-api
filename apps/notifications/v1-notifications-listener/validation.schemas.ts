import Joi from 'joi';

import { NotifierTypeEnum } from '@notifications/shared/enums';
import { DomainContextSchema, DomainContextType } from '@notifications/shared/types';

export type MessageType = {
  data: {
    requestUser: { id: string; identityId: string };
    action: NotifierTypeEnum;
    params: { [key: string]: any };
    domainContext?: DomainContextType;
  };
};

export const MessageSchema = Joi.object<MessageType>({
  data: Joi.object<MessageType['data']>({
    requestUser: Joi.object<MessageType['data']['requestUser']>({
      id: Joi.string().guid().required(),
      identityId: Joi.string().guid().required(),
    }).required(),

    action: Joi.string()
      .valid(...Object.values(NotifierTypeEnum))
      .required(),

    params: Joi.object().required(),
    domainContext: DomainContextSchema.optional(),
  }).required(),
}).required();
