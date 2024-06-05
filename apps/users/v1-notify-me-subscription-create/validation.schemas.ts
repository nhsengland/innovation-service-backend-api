import Joi from 'joi';

import { NotifyMeConfigSchema, type NotifyMeConfig } from '../_types/notify-me.types';

export type BodyType = {
  innovationId: string;
  config: NotifyMeConfig;
};
export const BodySchema = Joi.object<BodyType>({
  innovationId: Joi.string().uuid().required(),

  config: NotifyMeConfigSchema.required()
}).required();
