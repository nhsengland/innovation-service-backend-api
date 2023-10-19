import { NotificationLogTypeEnum } from '@notifications/shared/enums';
import Joi from 'joi';

import { EmailTemplates } from '../_config/emails.config';

export type MessageType = {
  data: {
    type: keyof EmailTemplates;
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
      .valid(...Object.keys(EmailTemplates))
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
