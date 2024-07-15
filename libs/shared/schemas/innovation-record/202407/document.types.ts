import type { catalogEvidenceSubmitType, catalogEvidenceType } from '../202304/catalog.types';

type OtherKeyValues = { [key: string]: any };

export type InnovationRecordDocumentType = {
  version: number;
  INNOVATION_DESCRIPTION: {
    name: string; // N
    description?: string; // N
    postcode?: string; // N
    countryName?: string; // N
    categories?: string[]; // N
    otherCategoryDescription?: string; // N
    mainCategory?: string; // N
    areas?: string[]; // N
    careSettings?: string[]; // N
    otherCareSetting?: string; // N
    involvedAACProgrammes?: string[]; // N
  } & OtherKeyValues;
  UNDERSTANDING_OF_NEEDS: {
    diseasesConditionsImpact?: string[]; // N
    keyHealthInequalities?: string[]; // N
  } & OtherKeyValues;
  EVIDENCE_OF_EFFECTIVENESS: {
    hasEvidence?: string;
    currentlyCollectingEvidence?: string;
    summaryOngoingEvidenceGathering?: string;
    needsSupportAnyArea?: string[];
  } & OtherKeyValues;
  MARKET_RESEARCH: OtherKeyValues;
  CURRENT_CARE_PATHWAY: OtherKeyValues;
  TESTING_WITH_USERS: {
    userTests?: { kind: string; feedback?: string }[]; // N
  } & OtherKeyValues;
  REGULATIONS_AND_STANDARDS: {
    standards?: { type: string; hasMet?: string }[]; // N
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
export const requiredSectionsAndQuestions = new Map([
  [
    'INNOVATION_DESCRIPTION',
    [
      'name',
      'description',
      'postcode',
      // 'countryName', // TODO: Enable this after doing the calculatedFields
      'categories',
      'otherCategoryDescription',
      'mainCategory',
      'areas',
      'careSettings',
      'otherCareSetting',
      'involvedAACProgrammes'
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
  [
    'REGULATIONS_AND_STANDARDS',
    [
      // 'standards' // TODO: Enable this after solving the fields-groups
    ]
  ],
  ['INTELLECTUAL_PROPERTY', []],
  ['REVENUE_MODEL', []],
  ['COST_OF_INNOVATION', []],
  ['DEPLOYMENT', []]
]);
