import Joi from 'joi';

import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';
import { InnovationTaskStatusEnum, ServiceRoleEnum } from '@innovations/shared/enums';

export type ParamsType = {
  innovationId: string;
  taskId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required(),
  taskId: Joi.string().guid().required()
}).required();

export type BodyType = {
  status: InnovationTaskStatusEnum;
  message?: string;
};

// TODO: CHECK IF JOI ALLOWS ARRAYS IN THE 'IS' CONDITION.
export const BodySchema = Joi.object<BodyType>({
  // TODO: UPDATE FE TO SEND userRole parameter instead of userType.
  status: Joi.when('$userRole', {
    is: ServiceRoleEnum.ACCESSOR,
    then: Joi.string().valid(InnovationTaskStatusEnum.OPEN, InnovationTaskStatusEnum.CANCELLED).required()
  })
    .when('$userRole', {
      is: ServiceRoleEnum.QUALIFYING_ACCESSOR,
      then: Joi.string().valid(InnovationTaskStatusEnum.OPEN, InnovationTaskStatusEnum.CANCELLED).required()
    })
    .when('$userRole', {
      is: ServiceRoleEnum.INNOVATOR,
      then: Joi.string().valid(InnovationTaskStatusEnum.DECLINED).required()
    }),

  message: Joi.when('$userRole', {
    is: ServiceRoleEnum.ACCESSOR,
    then: Joi.forbidden()
  })
    .when('$userRole', {
      is: ServiceRoleEnum.QUALIFYING_ACCESSOR,
      then: Joi.forbidden()
    })
    .when('$userRole', {
      is: ServiceRoleEnum.INNOVATOR,
      then: Joi.string().max(TEXTAREA_LENGTH_LIMIT.s).required()
    })
}).required();
