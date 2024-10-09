import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';
import Joi from 'joi';

export type ParamsType = {
  innovationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required()
}).required();

export type BodyType = {
  description: string;
  organisationUnits: string[];
};
export const BodySchema = Joi.object<BodyType>({
  description: Joi.string().max(TEXTAREA_LENGTH_LIMIT.xl).trim().required(),
  organisationUnits: Joi.array().items(Joi.string()).min(1).required()
}).required();
