import Joi from 'joi';

import { InnovationActionStatusEnum, ServiceRoleEnum } from '@innovations/shared/enums';


export type ParamsType = {
  innovationId: string,
  actionId: string
}
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required(),
  actionId: Joi.string().guid().required()
}).required();

export type BodyType = {
  status: InnovationActionStatusEnum,
  message?: string
}

// TODO: CHECK IF JOI ALLOWS ARRAYS IN THE 'IS' CONDITION.
export const BodySchema = Joi.object<BodyType>({
  // TODO: UPDATE FE TO SEND userRole parameter instead of userType.
  status:
    Joi.when('$userRole', {
      is: ServiceRoleEnum.ACCESSOR,
      then: Joi.string().valid(InnovationActionStatusEnum.REQUESTED, InnovationActionStatusEnum.COMPLETED, InnovationActionStatusEnum.CANCELLED).required()
    })
    .when('$userRole', {
      is: ServiceRoleEnum.QUALIFYING_ACCESSOR,
      then: Joi.string().valid(InnovationActionStatusEnum.REQUESTED, InnovationActionStatusEnum.COMPLETED, InnovationActionStatusEnum.CANCELLED).required()
    })
    .when('$userRole', {
      is: ServiceRoleEnum.INNOVATOR,
      then: Joi.string().valid(InnovationActionStatusEnum.DECLINED).required()
    }),

  message:
    Joi.when('$userRole', {
      is: ServiceRoleEnum.ACCESSOR,
      then: Joi.forbidden()
    })
    .when('$userRole', {
      is: ServiceRoleEnum.QUALIFYING_ACCESSOR,
      then: Joi.forbidden()
    })
    .when('$userRole', {
      is: ServiceRoleEnum.INNOVATOR,
      then: Joi.string().max(500).required()
    })

}).required();
