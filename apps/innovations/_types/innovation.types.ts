import type { InnovationActionStatusEnum, InnovationExportRequestStatusEnum, InnovationSectionEnum, InnovationSectionStatusEnum, InnovationSupportStatusEnum, MaturityLevelCatalogueEnum, UserTypeEnum, YesOrNoCatalogueEnum, YesPartiallyNoCatalogueEnum } from '@innovations/shared/enums';
import type { DateISOType, OrganisationWithUnitsType } from '@innovations/shared/types';
import type { InnovationStatisticsEnum } from '../_enums/innovation.enums';

export interface InnovationSectionModel {
  id: string | null,
  section: InnovationSectionEnum | null,
  status: InnovationSectionStatusEnum | null,
  actionStatus: InnovationActionStatusEnum | null,
  updatedAt: DateISOType | null,
  submittedAt: DateISOType | null
}

export type InnovationAssessmentType = {
  id: string,
  reassessment?: { updatedInnovationRecord: YesOrNoCatalogueEnum, description: string },
  summary: null | string,
  description: null | string,
  finishedAt: null | DateISOType,
  assignTo: { id: string, name: string },
  maturityLevel: null | MaturityLevelCatalogueEnum,
  maturityLevelComment: null | string,
  hasRegulatoryApprovals: null | YesPartiallyNoCatalogueEnum,
  hasRegulatoryApprovalsComment: null | string,
  hasEvidence: null | YesPartiallyNoCatalogueEnum,
  hasEvidenceComment: null | string,
  hasValidation: null | YesPartiallyNoCatalogueEnum,
  hasValidationComment: null | string,
  hasProposition: null | YesPartiallyNoCatalogueEnum,
  hasPropositionComment: null | string,
  hasCompetitionKnowledge: null | YesPartiallyNoCatalogueEnum,
  hasCompetitionKnowledgeComment: null | string,
  hasImplementationPlan: null | YesPartiallyNoCatalogueEnum,
  hasImplementationPlanComment: null | string,
  hasScaleResource: null | YesPartiallyNoCatalogueEnum,
  hasScaleResourceComment: null | string,
  suggestedOrganisations: OrganisationWithUnitsType[],
  updatedAt: null | DateISOType,
  updatedBy: { id: string, name: string }
};

export type ThreadListModel = {
  count: number,
  threads: {
    id: string,
    subject: string,
    messageCount: number,
    createdAt: DateISOType,
    isNew: boolean,
    lastMessage: {
      id: string,
      createdAt: DateISOType,
      createdBy: {
        id: string,
        name: string,
        type: UserTypeEnum,
        organisationUnit: null | { id: string, name: string, acronym: string }
      }
    }
  }[]
};

export type LastSupportStatusType = {
  statusChangedAt: Date;
  currentStatus: InnovationSupportStatusEnum;
  organisation: { id: string, name: string, acronym: string };
  organisationUnit: { id: string, name: string, acronym: string };
}


export type InnovationExportRequestItemType = {
  id: string,
  status: InnovationExportRequestStatusEnum,
  isExportable: boolean,
  requestReason: string,
  rejectReason?: null | string,
  expiresAt: DateISOType, // Returned only when "opened".
  organisation: {
    id: string,
    name: string,
    acronym: null | string, 
    organisationUnit: { id: string, name: string, acronym: null | string }
  },
  createdAt: DateISOType,
  createdBy: {  
    id: string,
    name: string
  }
}

export type InnovationExportRequestListType = InnovationExportRequestItemType[];  

export type InnovationStatisticsInputType = {

  [InnovationStatisticsEnum.ACTIONS_TO_SUBMIT]: {
    innovationId: string,
  },

  [InnovationStatisticsEnum.SECTIONS_SUBMITTED]: {
    innovationId: string,
  },

  [InnovationStatisticsEnum.UNREAD_MESSAGES]: {
    innovationId: string,
  },

}

export type InnovationStatisticsTemplateType = {

  [InnovationStatisticsEnum.ACTIONS_TO_SUBMIT]: {
    total: number,
    from: number,
    lastSubmittedAt: DateISOType,
  },

  [InnovationStatisticsEnum.SECTIONS_SUBMITTED]: {
    total: number,
  },

  [InnovationStatisticsEnum.UNREAD_MESSAGES]: {
    total: number,
  },

}
