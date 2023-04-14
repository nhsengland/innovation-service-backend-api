import type { InnovationActionStatusEnum, InnovationExportRequestStatusEnum, InnovationSectionStatusEnum, InnovationSupportLogTypeEnum, InnovationSupportStatusEnum, MaturityLevelCatalogueType, YesPartiallyNoCatalogueType } from '@innovations/shared/enums';
import type { CurrentCatalogTypes } from '@innovations/shared/schemas/innovation-record';
import type { OrganisationWithUnitsType } from '@innovations/shared/types';

export interface InnovationSectionModel {
  id: string | null,
  section: CurrentCatalogTypes.InnovationSections | null,
  status: InnovationSectionStatusEnum | null,
  actionStatus: InnovationActionStatusEnum | null,
  updatedAt: Date | null,
  submittedAt: Date | null
}

export type InnovationAssessmentType = {
  id: string,
  reassessment?: { updatedInnovationRecord: CurrentCatalogTypes.catalogYesNo, description: string },
  summary: null | string,
  description: null | string,
  finishedAt: null | Date,
  assignTo: { id: string, name: string },
  maturityLevel: null | MaturityLevelCatalogueType,
  maturityLevelComment: null | string,
  hasRegulatoryApprovals: null | YesPartiallyNoCatalogueType,
  hasRegulatoryApprovalsComment: null | string,
  hasEvidence: null | YesPartiallyNoCatalogueType,
  hasEvidenceComment: null | string,
  hasValidation: null | YesPartiallyNoCatalogueType,
  hasValidationComment: null | string,
  hasProposition: null | YesPartiallyNoCatalogueType,
  hasPropositionComment: null | string,
  hasCompetitionKnowledge: null | YesPartiallyNoCatalogueType,
  hasCompetitionKnowledgeComment: null | string,
  hasImplementationPlan: null | YesPartiallyNoCatalogueType,
  hasImplementationPlanComment: null | string,
  hasScaleResource: null | YesPartiallyNoCatalogueType,
  hasScaleResourceComment: null | string,
  suggestedOrganisations: OrganisationWithUnitsType[],
  updatedAt: null | Date,
  updatedBy: { id: string, name: string }
};

export type ThreadListModel = {
  count: number,
  threads: {
    id: string,
    subject: string,
    messageCount: number,
    createdAt: Date,
    isNew: boolean,
    lastMessage: {
      id: string,
      createdAt: Date,
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
  expiresAt?: Date, // Returned only when "opened".
  organisation: {
    id: string,
    name: string,
    acronym: null | string, 
    organisationUnit: { id: string, name: string, acronym: null | string }
  },
  createdAt: Date,
  createdBy: {  
    id: string,
    name: string
  },
  updatedAt: Date
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
  createdAt: Date;
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

export type InnovationSuggestionsType = {
  accessors?: InnovationSuggestionAccessor[];
  assessment?: {
    id?: string,
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
  };
}

export type InnovationSuggestionAccessor = {
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