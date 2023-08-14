import { ServiceRoleEnum } from '@admin/shared/enums';
import Joi from 'joi';

export type ParamsType = {
  userId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  userId: Joi.string().guid().required()
}).required();

export type BodyType = {
  roles: (
    | { role: ServiceRoleEnum.ACCESSOR | ServiceRoleEnum.QUALIFYING_ACCESSOR; orgId: string; unitId: string }
    | { role: ServiceRoleEnum.ADMIN | ServiceRoleEnum.ASSESSMENT }
  )[];
};
export const BodySchema = Joi.object<BodyType>({
  roles: Joi.array()
    .items(
      Joi.object({
        role: Joi.string()
          .valid(
            ServiceRoleEnum.ACCESSOR,
            ServiceRoleEnum.QUALIFYING_ACCESSOR,
            ServiceRoleEnum.ADMIN,
            ServiceRoleEnum.ASSESSMENT
          )
          .required(),
        orgId: Joi.when('role', [
          {
            is: ServiceRoleEnum.ACCESSOR,
            then: Joi.string().guid().required()
          },
          {
            is: ServiceRoleEnum.QUALIFYING_ACCESSOR,
            then: Joi.string().guid().required(),
            otherwise: Joi.forbidden()
          }
        ]),
        unitId: Joi.when('role', [
          {
            is: ServiceRoleEnum.ACCESSOR,
            then: Joi.string().guid().required()
          },
          {
            is: ServiceRoleEnum.QUALIFYING_ACCESSOR,
            then: Joi.string().guid().required(),
            otherwise: Joi.forbidden()
          }
        ])
      })
    )
    .min(1)
    .required()
});
