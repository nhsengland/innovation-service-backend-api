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
  status: Exclude<InnovationSupportStatusEnum, 'SUGGESTED'>;
  message: string;
};

export const BodySchema = Joi.object<BodyType>({
  status: JoiHelper.AppCustomJoi()
    .string()
    .valid(...Object.values(InnovationSupportStatusEnum))
    .disallow(InnovationSupportStatusEnum.SUGGESTED)
    .required(),
  message: JoiHelper.AppCustomJoi().string().max(TEXTAREA_LENGTH_LIMIT.xl).required()
}).required();
