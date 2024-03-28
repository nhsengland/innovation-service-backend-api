import Joi from 'joi';

export type ParamsType = {
  subscriptionId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  subscriptionId: Joi.string().guid().required()
}).required();
