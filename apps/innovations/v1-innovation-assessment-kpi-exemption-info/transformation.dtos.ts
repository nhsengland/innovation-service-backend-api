import { InnovationAssessmentKPIExemption, type InnovationAssessmentKPIExemptionType } from '@innovations/shared/types';
import Joi from 'joi';

export type ResponseDTO = {
  isExempted: boolean;
  exemption?: {
    reason: InnovationAssessmentKPIExemptionType;
    message?: string;
    exemptedAt: Date;
  };
};

export const ResponseBodySchema = Joi.object<ResponseDTO>({
  isExempted: Joi.boolean().required(),
  exemption: Joi.object({
    reason: Joi.string()
      .valid(...InnovationAssessmentKPIExemption)
      .required(),
    message: Joi.string().optional(),
    exemptedAt: Joi.date()
  }).optional()
});
