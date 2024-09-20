import Joi from 'joi';

import type { EmailTemplatesType } from '../_config/emails.config';
import { EmailTemplates } from '../_config/emails.config';

export type MessageType = {
  data: {
    type: keyof EmailTemplates;
    to: string;
    params: EmailTemplatesType[keyof EmailTemplates] & { displayName: string; unsubscribeUrl: string };
  };
};

export const MessageSchema = Joi.object<MessageType>({
  data: Joi.object<MessageType['data']>({
    type: Joi.string()
      .valid(...Object.keys(EmailTemplates))
      .required(),
    to: Joi.string().required(),
    params: Joi.object().required()
  }).required()
}).required();
