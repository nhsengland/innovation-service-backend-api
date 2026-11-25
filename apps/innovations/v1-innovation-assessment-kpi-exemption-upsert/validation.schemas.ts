import Joi from 'joi';

import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';
import { InnovationAssessmentKPIExemption } from '@innovations/shared/types';
import { JoiHelper } from '@innovations/shared/helpers';

export type ParamsType = {
  innovationId: string;
  assessmentId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: JoiHelper.AppCustomJoi().string().guid().required(),
  assessmentId: JoiHelper.AppCustomJoi().string().guid().required()
}).required();

export type BodyType = {
  reason: (typeof InnovationAssessmentKPIExemption)[number];
  message?: string;
};
export const BodySchema = Joi.object<BodyType>({
  reason: JoiHelper.AppCustomJoi()
    .string()
    .valid(...InnovationAssessmentKPIExemption)
    .required(),
  message: JoiHelper.AppCustomJoi().string().max(TEXTAREA_LENGTH_LIMIT.xl).optional()
}).required();
