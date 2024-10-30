import Joi from 'joi';

import { NotificationCategoryType, NotificationDetailType } from '@innovations/shared/enums';
import { JoiHelper } from '@innovations/shared/helpers';

export type ParamsType = {
  innovationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: JoiHelper.AppCustomJoi().string().guid().required()
}).required();

export type BodyType = {
  notificationIds: string[];
  contextTypes: NotificationCategoryType[];
  contextDetails: NotificationDetailType[];
  contextIds: string[];
};
export const BodySchema = Joi.object<BodyType>({
  notificationIds: Joi.array().items(JoiHelper.AppCustomJoi().string().guid()).default([]),
  contextTypes: Joi.array()
    .items(
      JoiHelper.AppCustomJoi()
        .string()
        .valid(...NotificationCategoryType)
    )
    .default([]),
  contextDetails: Joi.array()
    .items(
      JoiHelper.AppCustomJoi()
        .string()
        .valid(...NotificationDetailType)
    )
    .default([]),
  contextIds: Joi.array().items(JoiHelper.AppCustomJoi().string().guid()).default([])
}).required();
