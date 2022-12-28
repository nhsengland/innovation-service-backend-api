import Joi from 'joi';
import { DomainOperationEnum } from '../_config/domain-rules.config';

export type ParamsType = {
  userId: string
}
export const ParamsSchema = Joi.object<ParamsType>({
  userId: Joi.string().guid().required().description('Id of the user.')
}).required()

export type QueryParamsType = {
  operation: DomainOperationEnum
}
export const QueryParamsSchema = Joi.object<QueryParamsType>({
  operation: Joi.string().valid(...Object.values(DomainOperationEnum)).required().description('Type of the operation to validate.'),
}).required()
