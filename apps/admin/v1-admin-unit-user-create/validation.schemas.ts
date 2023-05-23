import { ServiceRoleEnum } from '@admin/shared/enums';
import Joi from 'joi';

export type ParamsType = {
  organisationUnitId: string;
  userId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  organisationUnitId: Joi.string().guid().required(),
  userId: Joi.string().guid().required()
}).required();

export type BodyType = {
  role: ServiceRoleEnum.ACCESSOR | ServiceRoleEnum.QUALIFYING_ACCESSOR;
};
export const BodySchema = Joi.object<BodyType>({
  role: Joi.string()
    .valid(...[ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR])
    .required()
});
