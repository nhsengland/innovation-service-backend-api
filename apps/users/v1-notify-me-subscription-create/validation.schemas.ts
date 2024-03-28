import Joi from 'joi';

import type {
  PeriodicSubscriptionType,
  ScheduledSubscriptionType,
  SubscriptionConfig,
  SubscriptionType
} from '@users/shared/types';
import { TEXTAREA_LENGTH_LIMIT } from '@users/shared/constants';

export type BodyType = {
  innovationId: string;
  config: SubscriptionConfig;
};
export const BodySchema = Joi.object<BodyType>({
  innovationId: Joi.string().uuid().required(),

  config: Joi.object<SubscriptionConfig>({
    eventType: Joi.string().required(),
    preConditions: Joi.object().required(),

    subscriptionType: Joi.string<SubscriptionType>().valid(...['INSTANTLY', 'SCHEDULED', 'PERIODIC']).required()
  })
    .when('.subscriptionType', {
      is: 'SCHEDULED',
      then: Joi.object<Omit<ScheduledSubscriptionType, 'subscriptionType'>>({
        date: Joi.date().required(),
        customMessages: Joi.object({
          inApp: Joi.string().max(50).optional(),
          email: Joi.string().max(TEXTAREA_LENGTH_LIMIT.xl).optional()
        })
      })
    })
    .when('.subscriptionType', {
      is: 'PERIODIC',
      then: Joi.object<Omit<PeriodicSubscriptionType, 'subscriptionType'>>({
        periodicity: Joi.string().valid(...['HOURLY', 'DAILY']).required()
      })
    })
    .required()
}).required();
