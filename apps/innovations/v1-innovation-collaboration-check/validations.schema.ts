import Joi from 'joi';

export type ParamsType = {
  collaboratorId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  collaboratorId: Joi.string().guid().required()
}).required();
