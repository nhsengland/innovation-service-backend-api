import Joi from 'joi';

import { EmailTemplates, EmailTemplatesType } from '../_config/emails.config';

export type MessageType = {
  data: {
    type: keyof EmailTemplates;
    to: string;
    params: EmailTemplatesType[keyof EmailTemplates];
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
