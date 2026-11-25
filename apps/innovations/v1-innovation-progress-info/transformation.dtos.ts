import type { InnovationListViewWithoutNull } from '@innovations/shared/entities/views/innovation-progress.view.entity';

/* this is a dynamic type coming directly from the database equivalent to:
{
  innovationId: string
  deploymentCount: number
  ukcaceCertification: 'YES'
  dtacCertification: 'YES'
  evidenceClinicalOrCare: 'YES'
  evidenceRealWorld: 'YES'
  assessmentRealWorldValidation: 'YES' | 'PARTIALLY'
  evidenceOfImpact: 'YES'
  assessmentEvidenceProveEfficacy: 'YES' | 'PARTIALLY'
  evidenceCostImpact: 'YES'
  workingProduct: 'YES'
  carbonReductionPlan: 'YES'
  htwTerComplete: 'YES'
  niceGuidanceComplete: 'YES'
  scProcurementRouteIdentified: 'YES'
}
*/
export type ResponseDTO = InnovationListViewWithoutNull;
