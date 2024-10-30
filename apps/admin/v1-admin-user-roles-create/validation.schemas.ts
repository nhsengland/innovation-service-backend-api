import { ServiceRoleEnum } from '@admin/shared/enums';
import { JoiHelper } from '@admin/shared/helpers';
import { CreateRolesSchema, type CreateRolesType } from '@admin/shared/types';
import Joi from 'joi';

export type ParamsType = {
  userId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  userId: JoiHelper.AppCustomJoi().string().guid().required()
}).required();

export type BodyType = CreateRolesType & { role: Exclude<CreateRolesType['role'], ServiceRoleEnum.ADMIN> };

export const BodySchema = CreateRolesSchema.fork('role', schema =>
  schema
    .valid(ServiceRoleEnum.ASSESSMENT, ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR)
    .required()
    .description('Role of the user.')
);
