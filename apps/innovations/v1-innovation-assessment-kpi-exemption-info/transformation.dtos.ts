import type { InnovationAssessmentKPIExemptionType } from '@innovations/shared/types';

export type ResponseDTO = {
  isExempted: boolean;
  exemption?: {
    reason: InnovationAssessmentKPIExemptionType;
    message?: string;
    exemptedAt: Date;
  };
};
