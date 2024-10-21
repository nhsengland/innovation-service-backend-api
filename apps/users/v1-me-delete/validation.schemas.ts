import Joi from 'joi';

import { TEXTAREA_LENGTH_LIMIT } from '@users/shared/constants';
import { JoiHelper } from '@users/shared/helpers';

export type BodyType = {
  reason: string;
};
export const BodySchema = Joi.object<BodyType>({
  reason: JoiHelper.AppCustomJoi().string().max(TEXTAREA_LENGTH_LIMIT.xl).required()
}).required();
