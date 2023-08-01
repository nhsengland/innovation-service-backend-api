export const InnovationAssessmentKPIExemption = [
  'NO_RESPONSE',
  'TECHNICAL_DIFFICULTIES',
  'INCORRECT_DETAILS',
  'SERVICE_UNAVAILABLE',
  'CAPACITY'
] as const;
export type InnovationAssessmentKPIExemptionType = (typeof InnovationAssessmentKPIExemption)[number];
