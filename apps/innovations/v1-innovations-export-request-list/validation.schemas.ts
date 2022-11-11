import Joi from 'joi';

export type PathParamsType = {
  innovationId: string;
}

export type QueryType = {
  skip?: number;
  take?: number;
}

export const PathParamsSchema = Joi.object<PathParamsType>({
  innovationId: Joi.string().uuid().required(),
}).required();

export const QuerySchema = Joi.object<QueryType>({
  skip: Joi.number().integer().min(0).default(0),
  take: Joi.number().integer().min(1).max(50).default(50),
}).required();
