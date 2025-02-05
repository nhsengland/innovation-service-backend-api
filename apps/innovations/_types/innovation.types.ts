import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';
import type {
  InnovationExportRequestStatusEnum,
  InnovationFileContextTypeEnum,
  InnovationSectionStatusEnum,
  InnovationSupportStatusEnum,
  InnovationTaskStatusEnum,
  MaturityLevelCatalogueType,
  YesPartiallyNoCatalogueType
} from '@innovations/shared/enums';
import { JoiHelper } from '@innovations/shared/helpers';
import type { CurrentCatalogTypes } from '@innovations/shared/schemas/innovation-record';
import type { OrganisationWithUnitsType } from '@innovations/shared/types';
import Joi from 'joi';

export interface InnovationSectionModel {
  id: string | null;
  section: CurrentCatalogTypes.InnovationSections | null;
  status: InnovationSectionStatusEnum | null;
  taskStatus: InnovationTaskStatusEnum | null;
  updatedAt: Date | null;
  submittedAt: Date | null;
}

export type ReassessmentType = {
  reassessmentReason: ReassessmentReasonsType[] | null;
  otherReassessmentReason?: string;
  description: string;
  whatSupportDoYouNeed: string | null;
};

export const ReassessmentReasons = ['NO_SUPPORT', 'PREVIOUSLY_ARCHIVED', 'HAS_PROGRESSED_SIGNIFICANTLY', 'OTHER'];
export type ReassessmentReasonsType = (typeof ReassessmentReasons)[number];

export type InnovationAssessmentType = {
  id: string;
  majorVersion: number;
  minorVersion: number;
  editReason: null | string;
  previousAssessment?: {
    id: string;
    majorVersion: number;
    minorVersion: number;
  };
  reassessment?: ReassessmentType & {
    sectionsUpdatedSinceLastAssessment: string[];
    createdAt: Date;
    previousCreatedAt?: Date;
  };
  summary: null | string;
  description: null | string;
  startedAt: null | Date;
  finishedAt: null | Date;
  assignTo?: { id: string; name: string };
  maturityLevel: null | MaturityLevelCatalogueType;
  maturityLevelComment: null | string;
  hasRegulatoryApprovals: null | YesPartiallyNoCatalogueType;
  hasRegulatoryApprovalsComment: null | string;
  hasEvidence: null | YesPartiallyNoCatalogueType;
  hasEvidenceComment: null | string;
  hasValidation: null | YesPartiallyNoCatalogueType;
  hasValidationComment: null | string;
  hasProposition: null | YesPartiallyNoCatalogueType;
  hasPropositionComment: null | string;
  hasCompetitionKnowledge: null | YesPartiallyNoCatalogueType;
  hasCompetitionKnowledgeComment: null | string;
  hasImplementationPlan: null | YesPartiallyNoCatalogueType;
  hasImplementationPlanComment: null | string;
  hasScaleResource: null | YesPartiallyNoCatalogueType;
  hasScaleResourceComment: null | string;
  suggestedOrganisations: OrganisationWithUnitsType[];
  updatedAt: null | Date;
  updatedBy: { id: string; name: string };
  isLatest: boolean;
};

export type ThreadListModel = {
  count: number;
  threads: {
    id: string;
    subject: string;
    messageCount: number;
    createdAt: Date;
    isNew: boolean;
    lastMessage: {
      id: string;
      createdAt: Date;
      createdBy: {
        id: string;
        name: string;
        organisationUnit: null | { id: string; name: string; acronym: string };
      };
    };
  }[];
};

export type LastSupportStatusType = {
  statusChangedAt: Date;
  currentStatus: InnovationSupportStatusEnum;
  organisation: { id: string; name: string; acronym: string };
  organisationUnit: { id: string; name: string; acronym: string };
};

export type InnovationExportRequestItemType = {
  id: string;
  status: InnovationExportRequestStatusEnum;
  isExportable: boolean;
  requestReason: string;
  rejectReason?: null | string;
  expiresAt?: Date; // Returned only when "opened".
  organisation: {
    id: string;
    name: string;
    acronym: null | string;
    organisationUnit: { id: string; name: string; acronym: null | string };
  };
  createdAt: Date;
  createdBy: {
    id: string;
    name: string;
  };
  updatedAt: Date;
};

export type InnovationExportRequestListType = InnovationExportRequestItemType[];

export type InnovationExportSectionAnswerType = {
  label: string;
  value: string;
};

export type InnovationExportSectionItemType = {
  section: string;
  status: InnovationSectionStatusEnum | 'UNKNOWN';
  answers: InnovationExportSectionAnswerType[];
};

export type InnovationAllSectionsType = {
  title: string;
  sections: InnovationExportSectionItemType[];
}[];

export type InnovationUnitSuggestionsType = {
  suggestionId: string;
  suggestorUnit: string;
  thread: {
    id: string;
    message: string;
  };
}[];

export type InnovationSuggestionsType = {
  accessors: InnovationSuggestionAccessor[];
  assessment: {
    suggestedOrganisations: SuggestedOrganisationInfo[];
  };
};

export type SuggestedOrganisationInfo = {
  id: string;
  name: string;
  acronym: string | null;
  organisationUnits: {
    id: string;
    name: string;
    acronym: string | null;
  }[];
};

export type InnovationSuggestionAccessor = {
  organisation: {
    id: string;
    name: string;
    acronym: string | null;
  };
  suggestedOrganisations: SuggestedOrganisationInfo[];
};

export type InnovationFileType = {
  name: string;
  description?: string;
  file: {
    id: string;
    name: string;
    size: number;
    extension: string;
  };
};

export type InnovationFileTypeWithContext = InnovationFileType & {
  context: { id: string; type: InnovationFileContextTypeEnum };
};

export const InnovationFileSchema = Joi.object<InnovationFileType>({
  name: JoiHelper.AppCustomJoi().string().max(100).required(),
  description: JoiHelper.AppCustomJoi().string().max(TEXTAREA_LENGTH_LIMIT.s).optional(),
  file: Joi.object({
    id: JoiHelper.AppCustomJoi().string().max(100).required(),
    name: JoiHelper.AppCustomJoi().string().max(100).required(),
    size: Joi.number().required(),
    extension: JoiHelper.AppCustomJoi().string().max(4).required()
  }).required()
});

export type InnovationFileOutputType = {
  name: string;
  size?: number;
  extension: string;
  url: string;
};

export type InnovationFileOutputContextType =
  | {
      id: string;
      type:
        | InnovationFileContextTypeEnum.INNOVATION
        | InnovationFileContextTypeEnum.INNOVATION_SECTION
        | InnovationFileContextTypeEnum.INNOVATION_PROGRESS_UPDATE;
    }
  | {
      id: string;
      type: InnovationFileContextTypeEnum.INNOVATION_EVIDENCE;
      name: string;
    }
  | {
      id: string;
      type: InnovationFileContextTypeEnum.INNOVATION_MESSAGE;
      name: string;
      threadId: string;
    };
