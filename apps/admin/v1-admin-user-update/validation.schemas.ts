import Joi from 'joi';

import { ServiceRoleEnum } from '@admin/shared/enums';
import { JoiHelper } from '@admin/shared/helpers';

export type ParamsType = {
  userId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  userId: JoiHelper.AppCustomJoi().string().guid().required().description('Id of the user to lock.')
}).required();

export type BodyType = {
  accountEnabled?: boolean;
  role?: { name: ServiceRoleEnum.ACCESSOR | ServiceRoleEnum.QUALIFYING_ACCESSOR; organisationId: string };
  email?: string;
};

export const BodySchema = Joi.object<BodyType>({
  accountEnabled: Joi.boolean().description('Activate or inactivate the user.'),
  role: Joi.object({
    name: JoiHelper.AppCustomJoi()
      .string()
      .valid(...Object.values([ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR]))
      .required()
      .description('Name of the role.'),
    organisationId: JoiHelper.AppCustomJoi().string().guid().required().description('Id of the organisation.')
  }),
  email: JoiHelper.AppCustomJoi().string().email().description('Email of the user.')
}).required();
