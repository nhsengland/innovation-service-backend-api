import Joi from 'joi';

export type ParamsType = {
  innovationId: string;
  taskId: string;
};

export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required(),
  taskId: Joi.string().guid().required()
}).required();
