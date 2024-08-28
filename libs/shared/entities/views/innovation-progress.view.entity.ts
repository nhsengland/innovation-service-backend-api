import { ViewColumn, ViewEntity } from 'typeorm';

@ViewEntity('innovation_progress_view')
export class InnovationProgressView {
  @ViewColumn({ name: 'innovation_id' })
  innovationId: string;

  @ViewColumn({ name: 'deployment_count' })
  deploymentCount: number | null;

  @ViewColumn({ name: 'ukcace_certification' })
  ukcaceCertification: 'YES' | null;

  @ViewColumn({ name: 'dtac_certification' })
  dtacCertification: 'YES' | null;

  @ViewColumn({ name: 'evidence_clinical_or_care' })
  evidenceClinicalOrCare: 'YES' | null;

  @ViewColumn({ name: 'evidence_real_world' })
  evidenceRealWorld: 'YES' | null;

  @ViewColumn({ name: 'assessment_real_world_validation' })
  assessmentRealWorldValidation: 'YES' | 'PARTIALLY' | null;

  @ViewColumn({ name: 'evidence_of_impact' })
  evidenceOfImpact: 'YES' | null;

  @ViewColumn({ name: 'assessment_evidence_prove_efficacy' })
  assessmentEvidenceProveEfficacy: 'YES' | 'PARTIALLY' | null;

  @ViewColumn({ name: 'evidence_cost_impact' })
  evidenceCostImpact: 'YES' | null;

  @ViewColumn({ name: 'working_product' })
  workingProduct: 'YES' | null;

  @ViewColumn({ name: 'carbon_reduction_plan' })
  carbonReductionPlan: 'YES' | null;

  @ViewColumn({ name: 'htw_ter_complete' })
  htwTerComplete: 'YES' | null;

  @ViewColumn({ name: 'nice_guidance_complete' })
  niceGuidanceComplete: 'YES' | null;

  @ViewColumn({ name: 'sc_procurement_route_identified' })
  scProcurementRouteIdentified: 'YES' | null;
}

export type InnovationListViewWithoutNull = Partial<{
  [K in keyof InnovationProgressView]: Exclude<InnovationProgressView[K], null>;
}>;
