import Joi from 'joi';

import { NotificationCategoryType, NotificationDetailType } from '@innovations/shared/enums';

export type ParamsType = {
  innovationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required()
}).required();

export type BodyType = {
  notificationIds: string[];
  contextTypes: NotificationCategoryType[];
  contextDetails: NotificationDetailType[];
  contextIds: string[];
};
export const BodySchema = Joi.object<BodyType>({
  notificationIds: Joi.array().items(Joi.string().guid()).default([]),
  contextTypes: Joi.array()
    .items(Joi.string().valid(...NotificationCategoryType))
    .default([]),
  contextDetails: Joi.array()
    .items(Joi.string().valid(...NotificationDetailType))
    .default([]),
  contextIds: Joi.array().items(Joi.string().guid()).default([])
}).required();
