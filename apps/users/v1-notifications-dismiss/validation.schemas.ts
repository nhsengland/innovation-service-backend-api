import { NotificationCategoryType, NotificationDetailType } from '@users/shared/enums';
import { JoiHelper } from '@users/shared/helpers';
import Joi from 'joi';

export type BodyType = {
  notificationIds: string[];
  contextIds: string[];
  contextTypes: NotificationCategoryType[];
  contextDetails: NotificationDetailType[];
  dismissAll: boolean;
};

// Note: Currently the only situation this endpoint is used is with dismissAll=true, kept the others to match the legacy endpoints (updated with current innovations format)
export const BodySchema = Joi.object<BodyType>({
  notificationIds: Joi.array().items(JoiHelper.AppCustomJoi().string().uuid()).default([]),
  contextIds: Joi.array().items(JoiHelper.AppCustomJoi().string().uuid()).default([]),
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
  dismissAll: Joi.boolean().description('Dismiss all notifications').default(false)
}).required();
