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
  organisationUnitIds?: string[];
};
export const QueryParamsSchema = Joi.object<QueryParamsType>({
  operation: Joi.string()
    .valid(...Object.values(AdminOperationEnum))
    .required()
    .description('Type of the operation to validate.'),
  roleId: Joi.alternatives().conditional('operation', {
    is: Joi.string().valid(AdminOperationEnum.INACTIVATE_USER_ROLE, AdminOperationEnum.ACTIVATE_USER_ROLE),
    then: Joi.string().guid().required()
  }),
  role: Joi.alternatives().conditional('operation', {
    is: Joi.string().valid(AdminOperationEnum.ADD_USER_ROLE),
    then: Joi.string()
      .valid(ServiceRoleEnum.ASSESSMENT, ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR)
      .required()
  }),
  organisationUnitIds: Joi.alternatives().conditional('role', {
    is: Joi.string().valid(ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR),
    then: Joi.array().items(Joi.string().guid()).required()
  })
}).required();
