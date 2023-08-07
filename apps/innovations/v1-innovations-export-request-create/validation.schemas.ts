import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';
import Joi from 'joi';

export type ParamsType = {
  innovationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().uuid().required()
}).required();

export type BodyType = {
  requestReason: string;
};
export const BodySchema = Joi.object<BodyType>({
  requestReason: Joi.string().max(TEXTAREA_LENGTH_LIMIT.s).required()
}).required();
