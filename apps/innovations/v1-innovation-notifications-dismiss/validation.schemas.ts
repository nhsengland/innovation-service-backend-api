import Joi from 'joi';

import { FlatNotificationTypes, NotificationCategoryType } from '@innovations/shared/enums';

export type ParamsType = {
  innovationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required()
}).required();

export type BodyType = {
  notificationIds: string[];
  contextTypes: NotificationCategoryType[];
  contextDetails: FlatNotificationTypes[];
  contextIds: string[];
};
export const BodySchema = Joi.object<BodyType>({
  notificationIds: Joi.array().items(Joi.string().guid()).default([]),
  contextTypes: Joi.array()
    .items(Joi.string().valid(...Object.values(NotificationCategoryType)))
    .default([]),
  contextDetails: Joi.array()
    .items(Joi.string().valid(...Object.values(FlatNotificationTypes)))
    .default([]),
  contextIds: Joi.array().items(Joi.string().guid()).default([])
}).required();
