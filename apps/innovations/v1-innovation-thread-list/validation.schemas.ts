import Joi from 'joi';

export type BodyType = {
  subject: string;
  message: string;
}
export const BodySchema = Joi.object<BodyType>({
  subject: Joi.string().max(200).required(),
  message: Joi.string().max(2000).required(),
}).required();

export type ParamsType = {
  innovationId: string;
}
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required(),
});

export type QueryParamsType = {
  skip?: number;
  take?: number;
  orderBy?: {
    subject?: 'ASC' | 'DESC';
    createdAt?: 'ASC' | 'DESC';
    messageCount?: 'ASC' | 'DESC';
  }
}

export const QueryParamsSchema = Joi.object<QueryParamsType>({
  skip: Joi.number().integer().min(0).default(0),
  take: Joi.number().integer().min(1).max(50).default(50),
  orderBy: Joi.object({
    subject: Joi.string().valid('ASC', 'DESC').default('DESC').optional(),
    createdAt: Joi.string().valid('ASC', 'DESC').default('DESC').optional(),
    messageCount: Joi.string().valid('ASC', 'DESC').default('DESC').optional(),
  }).optional(),
});
