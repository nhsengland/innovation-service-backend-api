import Joi from 'joi';

import {
  FlatNotificationTypes,
  NotificationCategoryEnum,
  NotificationContextDetailEnum,
  NotificationContextTypeEnum
} from '@notifications/shared/enums';

export type MessageType = {
  data: {
    requestUser: { id: string };
    innovationId: string;
    context: {
      type: NotificationContextTypeEnum;
      detail: NotificationContextDetailEnum;
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
        .valid(...Object.values(NotificationContextTypeEnum), ...Object.values(NotificationCategoryEnum))
        .required(),
      detail: Joi.string()
        .valid(...Object.values(NotificationContextDetailEnum), ...FlatNotificationTypes) // TODO remove the old enum probably
        .required(),
      id: Joi.string().guid().required()
    }).required(),

    userRoleIds: Joi.array().items(Joi.string().guid()).required(),

    params: Joi.object().required()
  }).required()
}).required();
