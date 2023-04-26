import Joi from 'joi';

export type ParamsType = {
  innovationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required(),
}).required();

export type BodyType = {
  organisations: string[];
};

export const BodySchema = Joi.object<BodyType>({
  organisations: Joi.array().items(Joi.string().guid()).min(1).required(),
}).required();
