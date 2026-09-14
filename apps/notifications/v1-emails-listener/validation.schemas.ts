import Joi from 'joi';

import type { EmailTemplatesType } from '../_config/emails.config';
import { EmailTemplates } from '../_config/emails.config';
import { JoiHelper } from '@notifications/shared/helpers';

export type MessageType = {
  attempt?: number;
  data: {
    type: keyof EmailTemplates;
    to: string;
    params: EmailTemplatesType[keyof EmailTemplates] & { displayName: string; unsubscribeUrl: string };
  };
};

export const MessageSchema = Joi.object<MessageType>({
  attempt: Joi.number().integer().min(1).optional(),
  data: Joi.object<MessageType['data']>({
    type: JoiHelper.AppCustomJoi()
      .string()
      .valid(...Object.keys(EmailTemplates))
      .required(),
    to: JoiHelper.AppCustomJoi().string().required(),
    params: Joi.object().required()
  }).required()
}).required();
