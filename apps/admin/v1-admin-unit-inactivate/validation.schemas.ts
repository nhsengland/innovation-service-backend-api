import Joi from 'joi';

export type ParamsType = {
  organisationId: string;
  organisationUnitId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  organisationId: Joi.string().guid().required(),
  organisationUnitId: Joi.string().guid().required()
}).required();
