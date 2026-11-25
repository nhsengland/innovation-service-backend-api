import Joi from 'joi';

import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';
import { ReassessmentReasons, type ReassessmentReasonsType } from '../_types/innovation.types';
import { JoiHelper } from '@innovations/shared/helpers';

export type ParamsType = {
  innovationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: JoiHelper.AppCustomJoi().string().guid().required()
}).required();

export type BodyType = {
  reassessmentReason: ReassessmentReasonsType[];
  otherReassessmentReason?: string;
  description: string;
  whatSupportDoYouNeed: string;
};

export const BodySchema = Joi.object<BodyType>({
  reassessmentReason: Joi.array()
    .items(
      JoiHelper.AppCustomJoi()
        .string()
        .valid(...ReassessmentReasons)
    )
    .min(1)
    .required(),
  otherReassessmentReason: JoiHelper.AppCustomJoi().string().max(TEXTAREA_LENGTH_LIMIT.xs).optional(),
  description: JoiHelper.AppCustomJoi().string().max(TEXTAREA_LENGTH_LIMIT.l).required(),
  whatSupportDoYouNeed: JoiHelper.AppCustomJoi().string().max(TEXTAREA_LENGTH_LIMIT.l).required()
});
