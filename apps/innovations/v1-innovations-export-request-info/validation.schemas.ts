import Joi from 'joi';

export type PathParamsType = {
  innovationId: string;
  requestId: string;
};

export const PathParamsSchema = Joi.object<PathParamsType>({
  innovationId: Joi.string().uuid().required(),
  requestId: Joi.string().uuid().required(),
}).required();
