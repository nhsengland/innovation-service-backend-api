import type { InnovationActionStatusEnum, InnovationSectionCatalogueEnum, InnovationSectionStatusEnum, UserTypeEnum } from '@innovations/shared/enums';
import type { DateISOType } from '@innovations/shared/types';

export interface InnovationSectionModel {
  id: string | null;
  section: InnovationSectionCatalogueEnum | null;
  status: InnovationSectionStatusEnum | null;
  actionStatus: InnovationActionStatusEnum | null;
  updatedAt: DateISOType | null;
  submittedAt: DateISOType | null;
}

export type InnovationAssessmentType = {
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
  updatedAt: null | DateISOType;
  updatedBy: { id: string, name: string };
}

export type ThreadListModel = {
  count: number;
  threads: {
    id: string;
    subject: string;
    messageCount: number;
    createdAt: string;
    isNew: boolean;
    lastMessage: {
      id: string;
      createdAt: string;
      createdBy: {
        id: string;
        name: string;
        type: UserTypeEnum;
        organisationUnit: { id: string; name: string; acronym: string } | null;
      };
    };
  }[];
};