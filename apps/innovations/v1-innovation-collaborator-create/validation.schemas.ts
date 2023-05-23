import Joi from 'joi';

export type ParamsType = {
  innovationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required()
}).required();

export type BodyType = {
  email: string;
  role: null | string;
};
export const BodySchema = Joi.object<BodyType>({
  email: Joi.string().email().required(),
  role: Joi.string().max(25).optional().allow(null)
}).required();
