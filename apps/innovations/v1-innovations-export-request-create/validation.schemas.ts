import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';
import Joi from 'joi';

export type BodyType = {
  requestReason: string;
};

export type ParamsType = {
  innovationId: string;
};

export const BodySchema = Joi.object<BodyType>({
  requestReason: Joi.string().max(TEXTAREA_LENGTH_LIMIT.s).required()
});

export const PathSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().uuid().required()
}).required();
