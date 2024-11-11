import Joi from 'joi';

import { NotificationCategoryType, NotificationDetailType } from '@notifications/shared/enums';
import { JoiHelper } from '@notifications/shared/helpers';

export type MessageType = {
  data: {
    requestUser: { id: string };
    innovationId: string;
    context: {
      type: NotificationCategoryType;
      detail: NotificationDetailType;
      id: string;
    };
    userRoleIds: string[];
    params: Record<string, unknown>;
    notificationId: string;
  };
};

export const MessageSchema = Joi.object<MessageType>({
  data: Joi.object<MessageType['data']>({
    requestUser: Joi.object({
      id: JoiHelper.AppCustomJoi().string().guid().required()
    }).required(),

    innovationId: JoiHelper.AppCustomJoi().string().guid().required(),

    context: Joi.object<MessageType['data']['context']>({
      type: JoiHelper.AppCustomJoi()
        .string()
        .valid(...NotificationCategoryType)
        .required(),
      detail: JoiHelper.AppCustomJoi()
        .string()
        .valid(...NotificationDetailType)
        .required(),
      id: JoiHelper.AppCustomJoi().string().guid().required()
    }).required(),

    userRoleIds: Joi.array().items(JoiHelper.AppCustomJoi().string().guid()).required(),

    params: Joi.object().required(),
    notificationId: JoiHelper.AppCustomJoi().string().guid().required()
  }).required()
}).required();
