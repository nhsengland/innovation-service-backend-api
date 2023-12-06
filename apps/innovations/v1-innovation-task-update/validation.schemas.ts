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
  message: string;
};

export const BodySchema = Joi.object<BodyType>({
  status: Joi.when('$userRole', {
    is: [ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR, ServiceRoleEnum.ASSESSMENT],
    then: Joi.string().valid(InnovationTaskStatusEnum.OPEN, InnovationTaskStatusEnum.CANCELLED).required(),
    otherwise: Joi.string().valid(InnovationTaskStatusEnum.DONE, InnovationTaskStatusEnum.DECLINED).required()
  }),
  message: Joi.string().max(TEXTAREA_LENGTH_LIMIT.s).required()
});
