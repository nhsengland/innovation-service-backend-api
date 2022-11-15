import Joi from 'joi';

import { NotificationContextTypeEnum } from '@innovations/shared/enums';


export type ParamsType = {
  innovationId: string
}
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required()
}).required();

export type BodyType = {
  notificationIds: string[]
  notificationContext: {
    id?: string
    type?: NotificationContextTypeEnum
  }
}
export const BodySchema = Joi.object<BodyType>({
  notificationIds: Joi.array().items(Joi.string().guid()).default([]),
  notificationContext: Joi.object({
    id: Joi.string().guid().optional(),
    type: Joi.string().valid(...Object.values(NotificationContextTypeEnum)).optional()
  }).default({})
}).required();
