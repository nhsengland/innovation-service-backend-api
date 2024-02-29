import Joi from 'joi';
import { ValidationRules } from '../_services/validation.service';

export type ParamsType = {
  innovationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required().description('Id of the innovation.')
}).required();

export type QueryParamsType = {
  operation: ValidationRules;
};
export const QueryParamsSchema = Joi.object<QueryParamsType>({
  operation: Joi.string()
    .valid(...Object.values(ValidationRules))
    .required()
    .description('Type of the operation to validate.')
}).required();
