import Joi from 'joi';

import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';

export type BodyType = {
  message: string;
};
export const BodySchema = Joi.object<BodyType>({
  message: Joi.string().max(TEXTAREA_LENGTH_LIMIT.xxl).trim().required()
}).required();

export type ParamsType = {
  innovationId: string;
  threadId: string;
  messageId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required(),
  threadId: Joi.string().guid().required(),
  messageId: Joi.string().guid().required()
});
