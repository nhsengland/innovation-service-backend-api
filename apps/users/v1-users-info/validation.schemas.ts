import Joi from 'joi';

export type PathParamsType = {
  userId: string;
}

export const PathParamsSchema = Joi.object<PathParamsType>({
  userId: Joi.string().uuid().required().description('The user ID')
}).required();

export enum ModelEnum {
  minimal = 'minimal',
  full = 'full',
}

export type QueryParamsType = {
  model: ModelEnum
}

export const QueryParamsSchema = Joi.object<QueryParamsType>({
  model: Joi.string().valid(...Object.values(ModelEnum)).default(ModelEnum.minimal).description('The model to use for the response')
}).required();