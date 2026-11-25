import Joi from 'joi';

import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';
import { JoiHelper } from '@innovations/shared/helpers';

export type BodyType = {
  message: string;
};
export const BodySchema = Joi.object<BodyType>({
  message: JoiHelper.AppCustomJoi().string().max(TEXTAREA_LENGTH_LIMIT.xxl).required()
}).required();

export type ParamsType = {
  innovationId: string;
  threadId: string;
  messageId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: JoiHelper.AppCustomJoi().string().guid().required(),
  threadId: JoiHelper.AppCustomJoi().string().guid().required(),
  messageId: JoiHelper.AppCustomJoi().string().guid().required()
});
