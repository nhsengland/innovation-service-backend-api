import Joi from 'joi';

import { NotificationCategoryType, NotificationContextDetailEnum } from '@innovations/shared/enums';

export type ParamsType = {
  innovationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required()
}).required();

export type BodyType = {
  notificationIds: string[];
  contextTypes: NotificationCategoryType[];
  contextDetails: NotificationContextDetailEnum[];
  contextIds: string[];
};
export const BodySchema = Joi.object<BodyType>({
  notificationIds: Joi.array().items(Joi.string().guid()).default([]),
  contextTypes: Joi.array()
    .items(Joi.string().valid(...Object.values(NotificationCategoryType)))
    .default([]),
  contextDetails: Joi.array()
    .items(Joi.string().valid(...Object.values(NotificationContextDetailEnum)))
    .default([]),
  contextIds: Joi.array().items(Joi.string().guid()).default([])
}).required();
