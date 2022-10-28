import Joi from 'joi';

export type PathParamsType = {
  innovationId: string;
}


export const PathParamsSchema = Joi.object<PathParamsType>({
  innovationId: Joi.string().uuid().required(),
}).required();
