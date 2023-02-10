import Joi from 'joi';

export type ParamsType = {
  organisationId: string
}

export const ParamsSchema = Joi.object<ParamsType>({
  organisationId: Joi.string().guid().required()
}).required();