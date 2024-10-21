import { JoiHelper } from '@users/shared/helpers';
import Joi from 'joi';

export type BodyType = { type: 'none' } | { type: 'email' } | { type: 'phone'; phoneNumber: string };
export const BodySchema = Joi.object<BodyType>({
  type: JoiHelper.AppCustomJoi().string().valid('none', 'email', 'phone').required(),
  phoneNumber: Joi.alternatives().conditional('type', {
    is: 'phone',
    then: JoiHelper.AppCustomJoi().string().max(20).required(),
    otherwise: Joi.forbidden()
  })
}).required();
