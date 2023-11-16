import Joi from 'joi';

import { FlatNotificationTypes, NotificationCategoryType } from '@notifications/shared/enums';

export type MessageType = {
  data: {
    requestUser: { id: string };
    innovationId: string;
    context: {
      type: NotificationCategoryType;
      detail: FlatNotificationTypes;
      id: string;
    };
    userRoleIds: string[];
    params: Record<string, unknown>;
  };
};

export const MessageSchema = Joi.object<MessageType>({
  data: Joi.object<MessageType['data']>({
    requestUser: Joi.object({
      id: Joi.string().guid().required()
    }).required(),

    innovationId: Joi.string().guid().required(),

    context: Joi.object<MessageType['data']['context']>({
      type: Joi.string()
        .valid(...NotificationCategoryType)
        .required(),
      detail: Joi.string()
        .valid(...FlatNotificationTypes)
        .required(),
      id: Joi.string().guid().required()
    }).required(),

    userRoleIds: Joi.array().items(Joi.string().guid()).required(),

    params: Joi.object().required()
  }).required()
}).required();
