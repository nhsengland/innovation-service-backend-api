import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';
import Joi from 'joi';
import { InnovationAssessmentKPIExemption } from '../_types/innovation.types';

export type ParamsType = {
  innovationId: string;
  assessmentId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required(),
  assessmentId: Joi.string().guid().required()
}).required();

export type BodyType = {
  reason: (typeof InnovationAssessmentKPIExemption)[number];
  message?: string;
};
export const BodySchema = Joi.object<BodyType>({
  reason: Joi.string()
    .valid(...InnovationAssessmentKPIExemption)
    .allow(null)
    .required(),
  message: Joi.string().max(TEXTAREA_LENGTH_LIMIT.xl).optional()
}).required();
