import Joi from 'joi';

export type ParamsType = {
  transferId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  transferId: Joi.string().guid().required(),
}).required();
