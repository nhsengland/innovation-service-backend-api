import Joi from 'joi';
import { TEXTAREA_LENGTH_LIMIT } from '../../../constants';
import { catalogAreas, catalogCareSettings, catalogCategory, catalogCostComparison, catalogHasCostKnowledge, catalogHasPatents, catalogHasRegulationKnowledge, catalogIntendedUserGroupsEngaged, cataloginvolvedAACProgrammes, catalogMainPurpose, catalogOptionBestDescribesInnovation, catalogPathwayKnowledge, catalogPatientRange, catalogRevenues, catalogStandardsType, catalogYesInProgressNotYet, catalogYesNo, catalogYesNoNotRelevant, catalogYesNoNotSure } from './catalog.types';
import type { DocumentType202304 } from './document.types';

export type DocumentValidationSchema202304Map = {
  [k in keyof Omit<DocumentType202304, 'version'>]: Joi.Schema<DocumentType202304[k]>;
}

export const DocumentValidationSchema202304Map: DocumentValidationSchema202304Map = {
  INNOVATION_DESCRIPTION: Joi.object<DocumentType202304['INNOVATION_DESCRIPTION']>({
    name: Joi.string().max(100).trim(),
    description: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium),
    countryName: Joi.string().max(100),
    postcode: Joi.string().max(20).allow(null),
    website: Joi.string().max(100).allow(null),  // TODO not validating URL format atm
    hasFinalProduct: Joi.string().valid(...catalogYesNo).allow(null),
    categories: Joi.array().items(Joi.string().valid(...catalogCategory)),
    otherCategoryDescription: Joi.string().max(100).allow(null),
    mainCategory: Joi.string().valid(...catalogCategory).allow(null),
    otherMainCategoryDescription: Joi.string().max(100).allow(null),
    areas: Joi.array().items(Joi.string().valid(...catalogAreas)),
    careSettings: Joi.array().items(Joi.string().valid(...catalogCareSettings)),
    otherCareSetting: Joi.string().max(100).allow(null),
    mainPurpose: Joi.string().valid(...catalogMainPurpose).allow(null),
    supportDescription: Joi.string().max(TEXTAREA_LENGTH_LIMIT.large).allow(null),
    currentlyReceivingSupport: Joi.string().max(TEXTAREA_LENGTH_LIMIT.large).allow(null),
    involvedAACProgrammes: Joi.array().items(Joi.string().valid(...cataloginvolvedAACProgrammes)),
  }).required().min(1),
  EVIDENCE_OF_EFFECTIVENESS: Joi.any(), // TODO this will be done after
  MARKET_RESEARCH: Joi.object<DocumentType202304['MARKET_RESEARCH']>({
    hasMarketResearch: Joi.string().valid(...catalogYesInProgressNotYet),
    marketResearch: Joi.string().max(TEXTAREA_LENGTH_LIMIT.largeDown).allow(null),
    optionBestDescribesInnovation: Joi.string().valid(...catalogOptionBestDescribesInnovation).allow(null),
    whatCompetitorsAlternativesExist: Joi.string().max(TEXTAREA_LENGTH_LIMIT.largeDown).allow(null),
  }).required().min(1),
  CURRENT_CARE_PATHWAY: Joi.object<DocumentType202304['CURRENT_CARE_PATHWAY']>({
    innovationPathwayKnowledge: Joi.string().valid(...catalogPathwayKnowledge).allow(null),
    potentialPathway: Joi.string().max(TEXTAREA_LENGTH_LIMIT.mediumUp).allow(null),
  }).required().min(1),
  TESTING_WITH_USERS: Joi.object<DocumentType202304['TESTING_WITH_USERS']>({
    involvedUsersDesignProcess: Joi.string().valid(...catalogYesInProgressNotYet),
    testedWithIntendedUsers: Joi.string().valid(...catalogYesInProgressNotYet).allow(null),
    intendedUserGroupsEngaged: Joi.array().items(Joi.string().valid(...catalogIntendedUserGroupsEngaged)).allow(null),
    otherIntendedUserGroupsEngaged: Joi.string().max(100).allow(null),
    userTests: Joi.array().items(Joi.object({
      kind: Joi.string().max(100),
      feedback: Joi.string().max(TEXTAREA_LENGTH_LIMIT.small).allow(null)
    })),
    files: Joi.array().items(Joi.string().guid())
  }).required().min(1),
  REGULATIONS_AND_STANDARDS: Joi.object<DocumentType202304['REGULATIONS_AND_STANDARDS']>({
    hasRegulationKnowledge: Joi.string().valid(...catalogHasRegulationKnowledge),
    standards: Joi.array().items(Joi.object({
      type: Joi.string().valid(...catalogStandardsType).required(),
      hasMet: Joi.string().valid(...catalogYesInProgressNotYet).allow(null)
    })),
    otherRegulationDescription: Joi.string().max(100).allow(null),
    files: Joi.array().items(Joi.string().guid())
  }).required().min(1),
  INTELLECTUAL_PROPERTY: Joi.object<DocumentType202304['INTELLECTUAL_PROPERTY']>({
    hasPatents: Joi.string().valid(...catalogHasPatents),
    hasOtherIntellectual: Joi.string().valid(...catalogYesNo).allow(null),
    otherIntellectual: Joi.string().max(100).allow(null)
  }).required().min(1),
  REVENUE_MODEL: Joi.object<DocumentType202304['REVENUE_MODEL']>({
    hasRevenueModel: Joi.string().valid(...catalogYesNo),
    revenues: Joi.array().items(Joi.string().valid(...catalogRevenues)),
    otherRevenueDescription: Joi.string().max(100).allow(null),
    payingOrganisations: Joi.string().max(TEXTAREA_LENGTH_LIMIT.mediumUp).allow(null),
    benefittingOrganisations: Joi.string().max(TEXTAREA_LENGTH_LIMIT.mediumUp).allow(null),
    hasFunding: Joi.string().valid(...catalogYesNoNotRelevant).allow(null),
    fundingDescription: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium).allow(null)
  }).required().min(1),
  COST_OF_INNOVATION: Joi.object<DocumentType202304['COST_OF_INNOVATION']>({
    hasCostKnowledge: Joi.string().valid(...catalogHasCostKnowledge),
    costDescription: Joi.string().max(TEXTAREA_LENGTH_LIMIT.mediumUp).allow(null),
    patientsRange: Joi.string().valid(...catalogPatientRange).allow(null),
    eligibilityCriteria: Joi.string().max(TEXTAREA_LENGTH_LIMIT.mediumUp).allow(null),
    sellExpectations: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium).allow(null),
    usageExpectations: Joi.string().max(TEXTAREA_LENGTH_LIMIT.mediumUp).allow(null),
    costComparison: Joi.string().valid(...catalogCostComparison).allow(null),
  }).required().min(1),
  DEPLOYMENT: Joi.object<DocumentType202304['DEPLOYMENT']>({
    hasDeployPlan: Joi.string().valid(...catalogYesNo),
    isDeployed: Joi.string().valid(...catalogYesNo).allow(null),
    deploymentPlans: Joi.array().items(Joi.string().max(100)),
    commercialBasis: Joi.string().max(TEXTAREA_LENGTH_LIMIT.large).allow(null),
    organisationDeploymentAffect: Joi.string().max(TEXTAREA_LENGTH_LIMIT.large).allow(null),
    hasResourcesToScale: Joi.string().valid(...catalogYesNoNotSure).allow(null),
    files: Joi.array().items(Joi.string().guid())
  }).required().min(1)
};
