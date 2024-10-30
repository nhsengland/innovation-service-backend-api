import Joi from 'joi';

import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';
import { InnovationSupportStatusEnum } from '@innovations/shared/enums';
import { JoiHelper } from '@innovations/shared/helpers';

export type ParamsType = {
  innovationId: string;
  supportId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: JoiHelper.AppCustomJoi().string().guid().required(),
  supportId: JoiHelper.AppCustomJoi().string().guid().required()
}).required();

export type BodyType = {
  status: Exclude<InnovationSupportStatusEnum, 'UNASSIGNED'>;
  message: string;
  accessors?: { id: string; userRoleId: string }[];
};
export const BodySchema = Joi.object<BodyType>({
  status: JoiHelper.AppCustomJoi()
    .string()
    .valid(
      InnovationSupportStatusEnum.ENGAGING,
      InnovationSupportStatusEnum.WAITING,
      InnovationSupportStatusEnum.UNSUITABLE,
      InnovationSupportStatusEnum.CLOSED
    )
    .required(),
  message: JoiHelper.AppCustomJoi().string().max(TEXTAREA_LENGTH_LIMIT.xxl).required(),
  accessors: Joi.when('status', {
    is: [InnovationSupportStatusEnum.ENGAGING, InnovationSupportStatusEnum.WAITING],
    then: Joi.array()
      .items(
        Joi.object({
          id: JoiHelper.AppCustomJoi().string().guid().required(),
          userRoleId: JoiHelper.AppCustomJoi().string().guid().required()
        })
      )
      .required(),
    otherwise: Joi.forbidden()
  })
}).required();
