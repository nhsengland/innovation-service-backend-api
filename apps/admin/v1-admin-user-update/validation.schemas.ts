import Joi from 'joi';

import { ServiceRoleEnum } from '@admin/shared/enums';

export type ParamsType = {
  userId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  userId: Joi.string().guid().required().description('Id of the user to lock.')
}).required();

export type BodyType = {
  accountEnabled?: boolean;
  role?: { name: ServiceRoleEnum.ACCESSOR | ServiceRoleEnum.QUALIFYING_ACCESSOR; organisationId: string };
};

export const BodySchema = Joi.object<BodyType>({
  accountEnabled: Joi.boolean().description('Activate or inactivate the user.'),
  role: Joi.object({
    name: Joi.string()
      .valid(...Object.values([ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR]))
      .required()
      .description('Name of the role.'),
    organisationId: Joi.string().guid().required().description('Id of the organisation.')
  })
}).required();
