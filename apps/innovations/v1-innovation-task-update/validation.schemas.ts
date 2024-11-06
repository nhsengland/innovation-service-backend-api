import Joi from 'joi';

import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';
import { InnovationTaskStatusEnum, ServiceRoleEnum } from '@innovations/shared/enums';
import { JoiHelper } from '@innovations/shared/helpers';

export type ParamsType = {
  innovationId: string;
  taskId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: JoiHelper.AppCustomJoi().string().guid().required(),
  taskId: JoiHelper.AppCustomJoi().string().guid().required()
}).required();

export type BodyType = {
  status: InnovationTaskStatusEnum;
  message: string;
};

export const BodySchema = Joi.object<BodyType>({
  status: Joi.when('$userRole', {
    is: [ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR, ServiceRoleEnum.ASSESSMENT],
    then: JoiHelper.AppCustomJoi()
      .string()
      .valid(InnovationTaskStatusEnum.OPEN, InnovationTaskStatusEnum.CANCELLED)
      .required(),
    otherwise: JoiHelper.AppCustomJoi()
      .string()
      .valid(InnovationTaskStatusEnum.DONE, InnovationTaskStatusEnum.DECLINED)
      .required()
  }),
  message: JoiHelper.AppCustomJoi().string().max(TEXTAREA_LENGTH_LIMIT.s).required()
});
