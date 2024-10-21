import Joi from 'joi';

import type { SubscriptionConfig } from '@users/shared/types';
import { NotifyMeConfigSchema } from '../_types/notify-me.types';
import { JoiHelper } from '@users/shared/helpers';

export type BodyType = {
  innovationId: string;
  config: SubscriptionConfig;
};
export const BodySchema = Joi.object<BodyType>({
  innovationId: JoiHelper.AppCustomJoi().string().uuid().required(),

  config: NotifyMeConfigSchema.required()
}).required();
