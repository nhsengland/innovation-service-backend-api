import Joi from 'joi';

export type ParamsType = {
  innovationId: string;
};

export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required()
}).required();

export type BodyType = {
  filename: string;
};
export const BodySchema = Joi.object<BodyType>({
  filename: Joi.string().max(100).required()
}).required();
