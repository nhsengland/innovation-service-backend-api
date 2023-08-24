import Joi from 'joi';
import { AdminOperationEnum } from '../_config/admin-operations.config';
import { ServiceRoleEnum } from '@admin/shared/enums';

export type ParamsType = {
  userId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  userId: Joi.string().guid().required().description('Id of the user.')
}).required();

export type QueryParamsType = {
  operation: AdminOperationEnum;
  roleId?: string;
  role?: ServiceRoleEnum;
  organisationUnitId?: string;
};
export const QueryParamsSchema = Joi.object<QueryParamsType>({
  operation: Joi.string()
    .valid(...Object.values(AdminOperationEnum))
    .required()
    .description('Type of the operation to validate.'),
  roleId: Joi.alternatives().conditional('operation', {
    is: Joi.string().valid(AdminOperationEnum.INACTIVATE_USER_ROLE),
    then: Joi.string().guid().required()
  }),
  role: Joi.alternatives().conditional('operation', {
    is: Joi.string().valid(AdminOperationEnum.ADD_USER_ROLE),
    then: Joi.string()
      .valid(ServiceRoleEnum.ASSESSMENT, ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR)
      .required()
  }),
  organisationUnitId: Joi.alternatives().conditional('role', {
    is: Joi.string().valid(ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR),
    then: Joi.string()
      .guid()
      .required()
  })
}).required();
