import Joi from 'joi';
import { TEXTAREA_LENGTH_LIMIT } from '../../../constants';
import { catalogAreas, catalogCarePathway, catalogCareSettings, catalogCategory, catalogCostComparison, catalogEnvironmentalBenefit, catalogGeneralBenefit, catalogHasCostKnowledge, catalogHasPatents, catalogHasRegulationKnowledge, catalogMainPurpose, catalogPathwayKnowledge, catalogPatientRange, catalogPatientsCitizensBenefit, catalogRevenues, catalogStandardsType, catalogsupportTypes, catalogYesInProgressNotYet, catalogYesNo, catalogYesNoNotRelevant, catalogYesNoNotSure, catalogYesNotYetNotSure } from './catalog.types';
import type { DocumentType202209 } from './document.type';

export type DocumentValidationSchema202209Map = {
  [k in keyof Omit<DocumentType202209, 'version'>]: Joi.Schema<DocumentType202209[k]>;
}

export const DocumentValidationSchema202209Map: DocumentValidationSchema202209Map = {
  INNOVATION_DESCRIPTION: Joi.object<DocumentType202209['INNOVATION_DESCRIPTION']>({
    name: Joi.string().max(100).trim(),
    description: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium),
    countryName: Joi.string(),
    postcode: Joi.string().allow(null),
    hasFinalProduct: Joi.string().valid(...catalogYesNo).allow(null),
    categories: Joi.array().items(Joi.string().valid(...catalogCategory)),
    otherCategoryDescription: Joi.string().allow(null),
    mainCategory: Joi.string().valid(...catalogCategory).allow(null),
    otherMainCategoryDescription: Joi.string().allow(null),
    areas: Joi.array().items(Joi.string().valid(...catalogAreas)),
    careSettings: Joi.array().items(Joi.string().valid(...catalogCareSettings)),
    otherCareSetting: Joi.string().max(100).allow(null),
    mainPurpose: Joi.string().valid(...catalogMainPurpose).allow(null),
    supportTypes: Joi.array().items(Joi.string().valid(...catalogsupportTypes)),
    moreSupportDescription: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium).allow(null),
  }).required().min(1),
  VALUE_PROPOSITION: Joi.object<DocumentType202209['VALUE_PROPOSITION']>({
    hasProblemTackleKnowledge: Joi.string().valid(...catalogYesNotYetNotSure).optional(),
    problemsTackled: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium).allow(null).optional(),
    problemsConsequences: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium).allow(null).optional(),
    intervention: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium).allow(null).optional(),
    interventionImpact: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium).allow(null).optional()
  }).required().min(1),
  UNDERSTANDING_OF_NEEDS: Joi.object<DocumentType202209['UNDERSTANDING_OF_NEEDS']>({
    impactPatients: Joi.boolean().strict(),
    impactClinicians: Joi.boolean().strict(),
    subgroups: Joi.array().items(Joi.string()).allow(null),
    cliniciansImpactDetails: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium).allow(null),
    diseasesConditionsImpact: Joi.array().items(Joi.string()).allow(null),
  }).required().min(1),
  UNDERSTANDING_OF_BENEFITS: Joi.object<DocumentType202209['UNDERSTANDING_OF_BENEFITS']>({
    hasBenefits: Joi.string().valid(...catalogYesNotYetNotSure),
    patientsCitizensBenefits: Joi.array().items(Joi.string().valid(...catalogPatientsCitizensBenefit)).allow(null),
    generalBenefits: Joi.array().items(Joi.string().valid(...catalogGeneralBenefit)).min(1).max(3).allow(null),
    otherGeneralBenefit: Joi.string().allow(null),
    environmentalBenefits: Joi.array().items(Joi.string().valid(...catalogEnvironmentalBenefit)).min(1).max(3).allow(null),
    otherEnvironmentalBenefit: Joi.string().allow(null),
    accessibilityImpactDetails: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium).allow(null),
    accessibilityStepsDetails: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium).allow(null)
  }).required().min(1),
  EVIDENCE_OF_EFFECTIVENESS: Joi.object<DocumentType202209['EVIDENCE_OF_EFFECTIVENESS']>({
    hasEvidence: Joi.string().valid(...catalogYesInProgressNotYet)
  }).required().min(1),
  MARKET_RESEARCH: Joi.object<DocumentType202209['MARKET_RESEARCH']>({
    hasMarketResearch: Joi.string().valid(...catalogYesInProgressNotYet),
    marketResearch: Joi.string().allow(null)
  }).required().min(1),
  INTELLECTUAL_PROPERTY: Joi.object<DocumentType202209['INTELLECTUAL_PROPERTY']>({
    hasPatents: Joi.string().valid(...catalogHasPatents),
    hasOtherIntellectual: Joi.string().valid(...catalogYesNo).allow(null),
    otherIntellectual: Joi.string().allow(null)
  }).required().min(1),
  REGULATIONS_AND_STANDARDS: Joi.object<DocumentType202209['REGULATIONS_AND_STANDARDS']>({
    hasRegulationKnowledge: Joi.string().valid(...catalogHasRegulationKnowledge),
    standards: Joi.array().items(Joi.object({
      type: Joi.string().valid(...catalogStandardsType).required(),
      hasMet: Joi.string().valid(...catalogYesInProgressNotYet).allow(null)
    })),
    otherRegulationDescription: Joi.string().allow(null),
    files: Joi.array().items(Joi.string().guid())
  }).required().min(1),
  CURRENT_CARE_PATHWAY: Joi.object<DocumentType202209['CURRENT_CARE_PATHWAY']>({
    hasUKPathwayKnowledge: Joi.string().valid(...catalogYesNoNotRelevant),
    innovationPathwayKnowledge: Joi.string().valid(...catalogPathwayKnowledge).allow(null),
    potentialPathway: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium).allow(null),
    carePathway: Joi.string().valid(...catalogCarePathway).allow(null)
  }).required().min(1),
  TESTING_WITH_USERS: Joi.object<DocumentType202209['TESTING_WITH_USERS']>({
    hasTests: Joi.string().valid(...catalogYesInProgressNotYet),
    userTests: Joi.array().items(Joi.object({
      kind: Joi.string(),
      feedback: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium).allow(null)
    })),
    files: Joi.array().items(Joi.string().guid())
  }).required().min(1),
  COST_OF_INNOVATION: Joi.object<DocumentType202209['COST_OF_INNOVATION']>({
    hasCostKnowledge: Joi.string().valid(...catalogHasCostKnowledge),
    costDescription: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium).allow(null),
    patientsRange: Joi.array().items(Joi.string().valid(...catalogPatientRange)).allow(null),
    sellExpectations: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium).allow(null),
    usageExpectations: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium).allow(null)
  }).required().min(1),
  COMPARATIVE_COST_BENEFIT: Joi.object<DocumentType202209['COMPARATIVE_COST_BENEFIT']>({
    hasCostSavingKnowledge: Joi.string().valid(...catalogHasCostKnowledge),
    hasCostCareKnowledge: Joi.string().valid(...catalogHasCostKnowledge).allow(null),
    costComparison: Joi.string().valid(...catalogCostComparison).allow(null),
  }).required().min(1),
  REVENUE_MODEL: Joi.object<DocumentType202209['REVENUE_MODEL']>({
    hasRevenueModel: Joi.string().valid(...catalogYesNo),
    revenues: Joi.array().items(Joi.string().valid(...catalogRevenues)),
    otherRevenueDescription: Joi.string().allow(null),
    payingOrganisations: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium).allow(null),
    benefittingOrganisations: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium).allow(null),
    hasFunding: Joi.string().valid(...catalogYesNoNotRelevant).allow(null),
    fundingDescription: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium).allow(null)
  }).required().min(1),
  IMPLEMENTATION_PLAN: Joi.object<DocumentType202209['IMPLEMENTATION_PLAN']>({
    hasDeployPlan: Joi.string().valid(...catalogYesNo),
    isDeployed: Joi.string().valid(...catalogYesNo).allow(null),
    deploymentPlans: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        commercialBasis: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium).allow(null),
        orgDeploymentAffect: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium).allow(null)
      })),
    hasResourcesToScale: Joi.string().valid(...catalogYesNoNotSure).allow(null),
    files: Joi.array().items(Joi.string().guid())
  }).required().min(1)
};
