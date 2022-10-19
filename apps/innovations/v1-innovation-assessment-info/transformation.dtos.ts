import type { DateISOType } from '@innovations/shared/types';

export type ResponseDTO = {
  id: string;
  summary: null | string;
  description: null | string;
  finishedAt: null | DateISOType;
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
  suggestedOrganisations: {
    id: string; name: string; acronym: null | string;
    units: { id: string; name: string; acronym: string; }[]
  }[];
  updatedAt: null | DateISOType,
  updatedBy: { id: string, name: string };
};
