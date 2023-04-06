import type { DocumentType202304 } from './document.types';

export const allowFileUploads = new Set<keyof DocumentType202304 >([
  'REGULATIONS_AND_STANDARDS',
  'TESTING_WITH_USERS',
  'DEPLOYMENT',
]);

export const version = '202304';

export enum InnovationSectionAliasEnum {
  INNOVATION_DESCRIPTION = 'ID',
  // VALUE_PROPOSITION = 'VP',
  // UNDERSTANDING_OF_NEEDS = 'UN',
  // UNDERSTANDING_OF_BENEFITS = 'UB',
  // EVIDENCE_OF_EFFECTIVENESS = 'EE',
  MARKET_RESEARCH = 'MR',
  CURRENT_CARE_PATHWAY = 'CP',
  TESTING_WITH_USERS = 'TU',
  REGULATIONS_AND_STANDARDS = 'RS',
  INTELLECTUAL_PROPERTY = 'IP',
  REVENUE_MODEL = 'RM',
  COST_OF_INNOVATION = 'CI',
  // COMPARATIVE_COST_BENEFIT = 'CB',  // This section does not exist anymore, what to do with actions
  DEPLOYMENT = 'D',        // TechDebt what to do with this one? This is used in actions and if we change the alias it might break things. Should there be some data migration on actions?
}
