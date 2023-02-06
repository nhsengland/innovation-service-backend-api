import type { InnovationActionStatusEnum, InnovationExportRequestStatusEnum, InnovationSectionEnum, InnovationSectionStatusEnum, InnovationSupportLogTypeEnum, InnovationSupportStatusEnum, MaturityLevelCatalogueEnum, YesOrNoCatalogueEnum, YesPartiallyNoCatalogueEnum } from '@innovations/shared/enums';
import type { DateISOType, OrganisationWithUnitsType } from '@innovations/shared/types';

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
  expiresAt?: DateISOType, // Returned only when "opened".
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
  },
  updatedAt: DateISOType
}

export type InnovationExportRequestListType = InnovationExportRequestItemType[];  

export type InnovationExportSectionAnswerType = {
  label: string;
  value: string;
}

export type InnovationExportSectionItemType = {
  section: string;
  answers: InnovationExportSectionAnswerType[];
}

export type InnovationExportSectionType = InnovationExportSectionItemType;

export type InnovationAllSectionsType = {
  title: string;
  sections: InnovationExportSectionType[];
}[];

export type InnovationSupportsLogType = {
  id: string;
  type: InnovationSupportLogTypeEnum;
  description: string;
  innovationSupportStatus: string;
  createdBy: string;
  createdAt: DateISOType;
  organisationUnit: null | {
    id: string;
    name: string;
    acronym: string | null;
    organisation: {
      id: string;
      name: string;
      acronym: string | null;
    };
  };
  suggestedOrganisationUnits?: {
    id: string;
    name: string;
    acronym: string | null;
    organisation: {
      id: string;
      name: string;
      acronym: string | null;
    };
  }[];
}