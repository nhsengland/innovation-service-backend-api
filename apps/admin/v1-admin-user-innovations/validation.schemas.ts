import Joi from 'joi';

export type ParamsType = {
  userId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  userId: Joi.string().guid().required()
}).required();

export type QueryParamsType = {
  includeAsCollaborator?: boolean;
};
export const QueryParamsSchema = Joi.object<QueryParamsType>({
  includeAsCollaborator: Joi.boolean().optional()
});
