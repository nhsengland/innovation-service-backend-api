import Joi from 'joi';

import type { SubscriptionConfig } from '@users/shared/types';
import { NotifyMeConfigSchema } from '../_types/notify-me.types';

export type BodyType = {
  innovationId: string;
  config: SubscriptionConfig;
};
export const BodySchema = Joi.object<BodyType>({
  innovationId: Joi.string().uuid().required(),

  config: NotifyMeConfigSchema.required()
}).required();
