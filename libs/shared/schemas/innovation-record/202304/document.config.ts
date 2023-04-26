import type { DocumentType202304 } from './document.types';

export const allowFileUploads = new Set<keyof DocumentType202304>([
  'UNDERSTANDING_OF_NEEDS',
  'EVIDENCE_OF_EFFECTIVENESS',
  'REGULATIONS_AND_STANDARDS',
  'TESTING_WITH_USERS',
  'DEPLOYMENT',
]);

export const version = '202304';

export enum InnovationSectionAliasEnum {
  INNOVATION_DESCRIPTION = 'ID',
  UNDERSTANDING_OF_NEEDS = 'UN',
  EVIDENCE_OF_EFFECTIVENESS = 'EE',
  MARKET_RESEARCH = 'MR',
  CURRENT_CARE_PATHWAY = 'CP',
  TESTING_WITH_USERS = 'TU',
  REGULATIONS_AND_STANDARDS = 'RS',
  INTELLECTUAL_PROPERTY = 'IP',
  REVENUE_MODEL = 'RM',
  COST_OF_INNOVATION = 'CI',
  DEPLOYMENT = 'D',
}
