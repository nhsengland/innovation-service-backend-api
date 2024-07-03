import Joi from 'joi';

import type { SubscriptionConfig } from '@users/shared/types';
import { NotifyMeConfigSchema } from '../_types/notify-me.types';

export type ParamType = {
  subscriptionId: string;
};

export const ParamSchema = Joi.object<ParamType>({
  subscriptionId: Joi.string().guid().required()
}).required();

export type BodyType = SubscriptionConfig;

export const BodySchema = NotifyMeConfigSchema.required();
