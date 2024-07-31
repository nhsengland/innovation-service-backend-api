import Joi from 'joi';

import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';

export type ParamsType = {
  innovationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required()
}).required();

export type BodyType = {
  reassessmentReason: string[];
  otherReassessmentReason?: string;
  description: string;
  whatSupportDoYouNeed: string;
};

export const BodySchema = Joi.object<BodyType>({
  reassessmentReason: Joi.array().items(Joi.string()).min(1).required(),
  otherReassessmentReason: Joi.string().max(TEXTAREA_LENGTH_LIMIT.xs).optional(),
  description: Joi.string().max(TEXTAREA_LENGTH_LIMIT.l).required(),
  whatSupportDoYouNeed: Joi.string().max(TEXTAREA_LENGTH_LIMIT.l).required()
});
