import { JoiHelper } from '@innovations/shared/helpers';
import Joi from 'joi';

export type ParamsType = {
  innovationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: JoiHelper.AppCustomJoi().string().guid().required()
}).required();

export type BodyType = {
  email: string;
  role: null | string;
};
export const BodySchema = Joi.object<BodyType>({
  email: JoiHelper.AppCustomJoi().string().email().required(),
  role: JoiHelper.AppCustomJoi().string().max(25).optional().allow(null)
}).required();
