import Joi from 'joi';

import { NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType } from '@notifications/shared/types';
import { DomainContextSchema } from '@notifications/shared/types';

export type MessageType = {
  data: {
    requestUser: DomainContextType;
    action: NotifierTypeEnum;
    params: { [key: string]: any };
    domainContext?: DomainContextType;
  };
};

export const MessageSchema = Joi.object<MessageType>({
  data: Joi.object<MessageType['data']>({
    requestUser: DomainContextSchema.required(),

    action: Joi.string()
      .valid(...Object.values(NotifierTypeEnum))
      .required(),

    params: Joi.object().required()
  }).required()
}).required();
