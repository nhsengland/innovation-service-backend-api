import type {
  InnovationSections,
  catalogEvidenceSubmitType,
  catalogEvidenceType,
  catalogCategory,
  catalogAreas,
  catalogCareSettings,
  catalogInvolvedAACProgrammes,
  catalogKeyHealthInequalities,
  catalogNeedsSupportAnyArea,
  catalogStandardsType
} from './catalog.types';

type OtherKeyValues = { [key: string]: any };

export type InnovationRecordDocumentType = {
  version: number;
  INNOVATION_DESCRIPTION: {
    name: string;
    description?: string;
    postcode?: string;
    countryName?: string;
    officeLocation?: string;
    countryLocation?: string;
    categories?: catalogCategory[];
    otherCategoryDescription?: string;
    mainCategory?: catalogCategory;
    areas?: catalogAreas[];
    careSettings?: catalogCareSettings[];
    otherCareSetting?: string;
    involvedAACProgrammes?: catalogInvolvedAACProgrammes[];
    hasWebsite?: string;
    website?: string;
  } & OtherKeyValues;
  UNDERSTANDING_OF_NEEDS: {
    diseasesConditionsImpact?: string[];
    keyHealthInequalities?: catalogKeyHealthInequalities[];
  } & OtherKeyValues;
  EVIDENCE_OF_EFFECTIVENESS: {
    hasEvidence?: string;
    currentlyCollectingEvidence?: string;
    summaryOngoingEvidenceGathering?: string;
    needsSupportAnyArea?: catalogNeedsSupportAnyArea[];
  } & OtherKeyValues;
  MARKET_RESEARCH: OtherKeyValues;
  CURRENT_CARE_PATHWAY: OtherKeyValues;
  TESTING_WITH_USERS: {
    userTests?: { kind: string; feedback?: string }[];
  } & OtherKeyValues;
  REGULATIONS_AND_STANDARDS: {
    standards?: { type: catalogStandardsType; hasMet?: string }[];
  } & OtherKeyValues;
  INTELLECTUAL_PROPERTY: OtherKeyValues;
  REVENUE_MODEL: OtherKeyValues;
  COST_OF_INNOVATION: OtherKeyValues;
  DEPLOYMENT: OtherKeyValues;
  evidences?: {
    id: string;
    evidenceSubmitType: catalogEvidenceSubmitType;
    evidenceType?: catalogEvidenceType;
    description?: string;
    summary: string;
  }[];
};

// Required Sections/Questions
export const requiredSectionsAndQuestions = new Map<InnovationSections, string[]>([
  [
    'INNOVATION_DESCRIPTION',
    [
      'name',
      'description',
      'postcode',
      'officeLocation',
      'countryLocation',
      'categories',
      'otherCategoryDescription',
      'mainCategory',
      'areas',
      'careSettings',
      'otherCareSetting',
      'involvedAACProgrammes',
      'hasWebsite',
      'website'
    ]
  ],
  ['UNDERSTANDING_OF_NEEDS', ['diseasesConditionsImpact', 'keyHealthInequalities']],
  [
    'EVIDENCE_OF_EFFECTIVENESS',
    ['hasEvidence', 'currentlyCollectingEvidence', 'summaryOngoingEvidenceGathering', 'needsSupportAnyArea']
  ],
  ['MARKET_RESEARCH', []],
  ['CURRENT_CARE_PATHWAY', []],
  ['TESTING_WITH_USERS', ['userTests']],
  ['REGULATIONS_AND_STANDARDS', ['standards']],
  ['INTELLECTUAL_PROPERTY', []],
  ['REVENUE_MODEL', []],
  ['COST_OF_INNOVATION', []],
  ['DEPLOYMENT', []]
]);
