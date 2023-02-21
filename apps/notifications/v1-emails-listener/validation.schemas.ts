import { NotificationLogTypeEnum } from '@notifications/shared/enums';
import { DomainContextSchema, DomainContextType } from '@notifications/shared/types';
import Joi from 'joi';

import { EmailTypeEnum } from '../_config/emails.config';


export type MessageType = {
  data: {
    type: EmailTypeEnum,
    to: { type: 'email' | 'identityId', value: string, displayNameParam?: string },
    params: { [key: string]: string | number | string[] },
    log?: {
      type: NotificationLogTypeEnum,
      params: Record<string, string | number>,
    },
    domainContext: DomainContextType,
  }
}

export const MessageSchema = Joi.object<MessageType>({
  data: Joi.object<MessageType['data']>({
    type: Joi.string().valid(...Object.values(EmailTypeEnum)).required(),
    to: Joi.object<MessageType['data']['to']>({
      type: Joi.string().valid('email', 'identityId').required(),
      value: Joi.string().required(),
      displayNameParam: Joi.string().optional()
    }).required(),
    params: Joi.object().required(),
    log: Joi.object({
      type: Joi.string().valid(...Object.values(NotificationLogTypeEnum)).required(),
      params: Joi.object().required()
    }).optional(),
    domainContext: DomainContextSchema.optional(),
  }).required()
}).required();
