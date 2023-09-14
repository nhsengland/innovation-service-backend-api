import Joi from 'joi';

import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';

export type BodyType = {
  subject: string;
  message: string;
  followerUserRoleIds: string[]
};
export const BodySchema = Joi.object<BodyType>({
  subject: Joi.string().max(200).required(),
  message: Joi.string().max(TEXTAREA_LENGTH_LIMIT.xxl).required(),
  followerUserRoleIds: Joi.array().items(Joi.string().guid()).required()
}).required();

export type ParamsType = {
  innovationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required()
});
