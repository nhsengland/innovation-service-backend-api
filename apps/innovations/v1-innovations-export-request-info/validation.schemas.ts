import Joi from 'joi';

export type ParamsType = {
  innovationId: string;
  requestId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().uuid().required(),
  requestId: Joi.string().uuid().required()
}).required();
