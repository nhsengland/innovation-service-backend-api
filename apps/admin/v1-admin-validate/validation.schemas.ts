import Joi from 'joi';

import { AdminOperationType } from '../_config/admin-operations.config';

export type ParamsType = {
  userId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  userId: Joi.string().guid().required().description('Id of the user.'),
}).required();

export type QueryParamsType = {
  operation: AdminOperationType;
};
export const QueryParamsSchema = Joi.object<QueryParamsType>({
  operation: Joi.string()
    .valid(...Object.values(AdminOperationType))
    .required()
    .description('Type of the operation to validate.'),
}).required();
