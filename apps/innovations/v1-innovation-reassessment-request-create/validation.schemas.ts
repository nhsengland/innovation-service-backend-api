import Joi from 'joi';

import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';
import { ReassessmentReasons, type ReassessmentReasonsType } from '../_types/innovation.types';

export type ParamsType = {
  innovationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required()
}).required();

export type BodyType = {
  reassessmentReason: ReassessmentReasonsType[];
  otherReassessmentReason?: string;
  description: string;
  whatSupportDoYouNeed: string;
};

export const BodySchema = Joi.object<BodyType>({
  reassessmentReason: Joi.array().items(Joi.string().valid(ReassessmentReasons)).min(1).required(),
  otherReassessmentReason: Joi.string().max(TEXTAREA_LENGTH_LIMIT.xs).optional(),
  description: Joi.string().max(TEXTAREA_LENGTH_LIMIT.l).required(),
  whatSupportDoYouNeed: Joi.string().max(TEXTAREA_LENGTH_LIMIT.l).required()
});
