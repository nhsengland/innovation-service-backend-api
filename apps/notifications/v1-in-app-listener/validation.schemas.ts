import Joi from 'joi';

import { NotificationContextDetailEnum, NotificationContextTypeEnum, ServiceRoleEnum } from '@notifications/shared/enums';
import { DomainContextSchema, DomainContextType } from '@notifications/shared/types';

export type MessageType = {
  data: {
    requestUser: { id: string },
    innovationId: string,
    context: { type: NotificationContextTypeEnum, detail: NotificationContextDetailEnum, id: string },
    users: { userId: string, organisationUnitId?: string | undefined}[];
    params: { [key: string]: string | number | string[] },
    domainContext: DomainContextType,
  }
}

export const MessageSchema = Joi.object<MessageType>({

  data: Joi.object<MessageType['data']>({

    requestUser: Joi.object<MessageType['data']['requestUser']>({
      id: Joi.string().guid().required()
    }).required(),

    // domainContext: DomainContextSchema.optional(),

    innovationId: Joi.string().guid().required(),

    context: Joi.object<MessageType['data']['context']>({
      type: Joi.string().valid(...Object.values(NotificationContextTypeEnum)).required(),
      detail: Joi.string().valid(...Object.values(NotificationContextDetailEnum)).required(),
      id: Joi.string().guid().required()
    }).required(),

    users: Joi.array().items(Joi.object({
      userId: Joi.string().guid().required(),
      organisationUnitId: Joi.string().allow(null).guid().optional(),
      userType: Joi.string().valid(...Object.values(ServiceRoleEnum)).optional(),
    })).required(),

    params: Joi.object().required(),

    domainContext: DomainContextSchema.required(),
  }).required()

}).required();
