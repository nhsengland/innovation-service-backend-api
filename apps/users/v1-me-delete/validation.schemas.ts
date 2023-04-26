import Joi from 'joi';

import { TEXTAREA_LENGTH_LIMIT } from '@users/shared/constants';

export type BodyType = {
  reason: string;
};

export const BodySchema = Joi.object<BodyType>({
  reason: Joi.string().max(TEXTAREA_LENGTH_LIMIT.large).allow(null, ''),
}).required();
