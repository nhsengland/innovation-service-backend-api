import { NotificationCategoryType } from '@users/shared/enums';
import Joi from 'joi';

export type BodyType = {
  notificationIds: string[];
  contextIds: string[];
  contextTypes: NotificationCategoryType[];
  dismissAll: boolean;
};

// Note: Currently the only situation this endpoint is used is with dismissAll=true, kept the others to match the legacy endpoints (updated with current innovations format)
export const BodySchema = Joi.object<BodyType>({
  notificationIds: Joi.array().items(Joi.string().uuid()).description('The notification IDs').default([]),
  contextIds: Joi.array().items(Joi.string().uuid()).description('The context IDs').default([]),
  contextTypes: Joi.array()
    .items(Joi.string().valid(...Object.values(NotificationCategoryType)))
    .description('The context types')
    .default([]),
  dismissAll: Joi.boolean().description('Dismiss all notifications').default(false)
}).required();
