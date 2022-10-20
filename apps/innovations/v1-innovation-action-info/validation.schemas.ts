import * as Joi from 'joi';

export type ParamsType = {
  innovationId: string;
  actionId: string;
}

export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required(),
  actionId: Joi.string().guid().required()
}).required();