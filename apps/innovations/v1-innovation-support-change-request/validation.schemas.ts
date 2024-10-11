import Joi from 'joi';

import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';
import { InnovationSupportStatusEnum } from '@innovations/shared/enums';

export type ParamsType = {
  innovationId: string;
  supportId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required(),
  supportId: Joi.string().guid().required()
}).required();

export type BodyType = {
  status: Exclude<InnovationSupportStatusEnum, 'SUGGESTED'>;
  message: string;
};

export const BodySchema = Joi.object<BodyType>({
  status: Joi.string()
    .valid(...Object.values(InnovationSupportStatusEnum))
    .disallow(InnovationSupportStatusEnum.SUGGESTED)
    .required(),
  message: Joi.string().max(TEXTAREA_LENGTH_LIMIT.xl).trim().required()
}).required();
