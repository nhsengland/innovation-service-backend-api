import Joi from 'joi';

export type ParamsType = {
  innovationId: string;
  threadId: string;
}

export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required(),
  threadId: Joi.string().guid().required(),
});

export type QueryParamsType = {
  skip?: number;
  take?: number;
  order?: string;
}

export const QueryParamsSchema = Joi.object<QueryParamsType>({
  skip: Joi.number().integer().min(0).default(0),
  take: Joi.number().integer().min(1).max(50).default(50),
  order: Joi.string().optional(),
});