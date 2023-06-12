import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';
import Joi from 'joi';

export type BodyType = {
  requestReason: string;
};

export type PathParamsType = {
  innovationId: string;
};

export const BodySchema = Joi.object<BodyType>({
  requestReason: Joi.string().max(TEXTAREA_LENGTH_LIMIT.s).required()
});

export const PathParamsSchema = Joi.object<PathParamsType>({
  innovationId: Joi.string().uuid().required()
}).required();
