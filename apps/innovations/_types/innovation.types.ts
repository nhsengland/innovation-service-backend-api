import { InnovationActionStatusEnum, InnovationSectionCatalogueEnum, InnovationSectionStatusEnum } from '@nhse/shared';

export interface InnovationSectionModel {
  id: string | null;
  section: InnovationSectionCatalogueEnum | null;
  status: InnovationSectionStatusEnum | null;
  actionStatus: InnovationActionStatusEnum | null;
  updatedAt: Date | null;
  submittedAt: Date | null;
}

export type InnovationAssessmentType = {
  id: string;
  summary: null | string;
  description: null | string;
  finishedAt: null | Date;
  assignTo: { id: string, name: string };
  maturityLevel: null | string;
  maturityLevelComment: null | string;
  hasRegulatoryApprovals: null | string;
  hasRegulatoryApprovalsComment: null | string;
  hasEvidence: null | string;
  hasEvidenceComment: null | string;
  hasValidation: null | string;
  hasValidationComment: null | string;
  hasProposition: null | string;
  hasPropositionComment: null | string;
  hasCompetitionKnowledge: null | string;
  hasCompetitionKnowledgeComment: null | string;
  hasImplementationPlan: null | string;
  hasImplementationPlanComment: null | string;
  hasScaleResource: null | string;
  hasScaleResourceComment: null | string;
}
