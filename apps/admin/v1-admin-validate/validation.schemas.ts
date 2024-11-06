import Joi from 'joi';
import { AdminOperationEnum } from '../_config/admin-operations.config';
import { ServiceRoleEnum } from '@admin/shared/enums';
import { JoiHelper } from '@admin/shared/helpers';

export type ParamsType = {
  userId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  userId: JoiHelper.AppCustomJoi().string().guid().required().description('Id of the user.')
}).required();

export type QueryParamsType = {
  operation: AdminOperationEnum;
  roleId?: string;
  role?: ServiceRoleEnum;
  organisationUnitIds?: string[];
};
export const QueryParamsSchema = Joi.object<QueryParamsType>({
  operation: JoiHelper.AppCustomJoi()
    .string()
    .valid(...Object.values(AdminOperationEnum))
    .required()
    .description('Type of the operation to validate.'),
  roleId: Joi.alternatives().conditional('operation', {
    is: JoiHelper.AppCustomJoi()
      .string()
      .valid(AdminOperationEnum.INACTIVATE_USER_ROLE, AdminOperationEnum.ACTIVATE_USER_ROLE),
    then: JoiHelper.AppCustomJoi().string().guid().required()
  }),
  role: Joi.alternatives().conditional('operation', {
    is: JoiHelper.AppCustomJoi().string().valid(AdminOperationEnum.ADD_USER_ROLE),
    then: JoiHelper.AppCustomJoi()
      .string()
      .valid(ServiceRoleEnum.ASSESSMENT, ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR)
      .required()
  }),
  organisationUnitIds: Joi.alternatives().conditional('role', {
    is: JoiHelper.AppCustomJoi().string().valid(ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR),
    then: JoiHelper.AppCustomJoi().stringArray().items(JoiHelper.AppCustomJoi().string().guid()).required()
  })
}).required();
