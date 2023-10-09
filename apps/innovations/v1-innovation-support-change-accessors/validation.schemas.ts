import Joi from 'joi';

import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';

export type ParamsType = {
  innovationId: string;
  supportId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required(),
  supportId: Joi.string().guid().required()
}).required();

export type BodyType = {
  message?: string;
  accessors: { id: string; userRoleId: string }[];
};

export const BodySchema = Joi.object<BodyType>({
  message: Joi.string().max(TEXTAREA_LENGTH_LIMIT.xl).trim().optional(),
  accessors: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().guid().required(),
        userRoleId: Joi.string().guid().required()
      })
    )
    .min(1)
    .required()
}).required();
