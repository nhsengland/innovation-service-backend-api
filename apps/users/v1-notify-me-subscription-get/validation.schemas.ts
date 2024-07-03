import Joi from 'joi';

export type ParamType = {
  subscriptionId: string;
};

export const ParamSchema = Joi.object<ParamType>({
  subscriptionId: Joi.string().guid().required()
}).required();
