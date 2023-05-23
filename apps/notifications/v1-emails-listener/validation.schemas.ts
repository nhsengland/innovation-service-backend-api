import { NotificationLogTypeEnum } from '@notifications/shared/enums';
import Joi from 'joi';

import { EmailTypeEnum } from '../_config/emails.config';

export type MessageType = {
  data: {
    type: EmailTypeEnum;
    to: string;
    params: Record<string, unknown>;
    log?: {
      type: NotificationLogTypeEnum;
      params: Record<string, string | number>;
    };
  };
};

export const MessageSchema = Joi.object<MessageType>({
  data: Joi.object<MessageType['data']>({
    type: Joi.string()
      .valid(...Object.values(EmailTypeEnum))
      .required(),
    to: Joi.string().required(),
    params: Joi.object().required(),
    log: Joi.object({
      type: Joi.string()
        .valid(...Object.values(NotificationLogTypeEnum))
        .required(),
      params: Joi.object().required()
    }).optional()
  }).required()
}).required();
