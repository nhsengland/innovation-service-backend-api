import Joi from 'joi';

export type ParamsType = {
  touId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  touId: Joi.string().guid().required().description('The terms of use id.')
}).required();
