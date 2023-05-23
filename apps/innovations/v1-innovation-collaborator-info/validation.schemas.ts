import Joi from 'joi';

export type ParamsType = {
  innovationId: string;
  collaboratorId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required(),
  collaboratorId: Joi.string().guid().required()
}).required();
