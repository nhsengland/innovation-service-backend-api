import Joi from 'joi';

import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';
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
  message: string;
  accessors: { id: string; userRoleId: string }[];
};

export const BodySchema = Joi.object<BodyType>({
  message: JoiHelper.AppCustomJoi().string().allow(null, '').max(TEXTAREA_LENGTH_LIMIT.xl).required(),
  accessors: Joi.array()
    .items(
      Joi.object({
        id: JoiHelper.AppCustomJoi().string().guid().required(),
        userRoleId: JoiHelper.AppCustomJoi().string().guid().required()
      })
    )
    .min(1)
    .required()
}).required();
