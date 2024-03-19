import Joi from 'joi';
import { TEXTAREA_LENGTH_LIMIT } from '../../../constants';
import {
  catalogAreas,
  catalogCarbonReductionPlan,
  catalogCareSettings,
  catalogCategory,
  catalogCostComparison,
  catalogEvidenceSubmitType,
  catalogEvidenceType,
  catalogHasCostKnowledge,
  catalogHasPatents,
  catalogHasRegulationKnowledge,
  catalogHasRevenueModel,
  catalogIntendedUserGroupsEngaged,
  catalogInvolvedAACProgrammes,
  catalogKeyHealthInequalities,
  catalogMainPurpose,
  catalogNeedsSupportAnyArea,
  catalogOptionBestDescribesInnovation,
  catalogPathwayKnowledge,
  catalogPatientRange,
  catalogRevenues,
  catalogStandardsType,
  catalogYesInProgressNotYet,
  catalogYesNo,
  catalogYesNoNotRelevant,
  catalogYesNoNotSure,
  catalogYesNotYet,
  catalogYesNotYetNo
} from './catalog.types';
import type { DocumentType202304 } from './document.types';

export type DocumentValidationSchema202304Map = {
  [k in keyof Omit<DocumentType202304, 'version'>]: Joi.Schema<DocumentType202304[k]>;
};

export const EvidenceSchema202304 = Joi.object<NonNullable<DocumentType202304['evidences']>[number]>({
  evidenceSubmitType: Joi.string()
    .valid(...catalogEvidenceSubmitType)
    .required(),
  evidenceType: Joi.string().valid(...catalogEvidenceType),
  description: Joi.string().max(50),
  summary: Joi.string().max(TEXTAREA_LENGTH_LIMIT.m).required()
});

export const DocumentValidationSchema202304Map: DocumentValidationSchema202304Map = {
  INNOVATION_DESCRIPTION: Joi.object<DocumentType202304['INNOVATION_DESCRIPTION']>({
    name: Joi.string().max(100).trim(),
    description: Joi.string().max(TEXTAREA_LENGTH_LIMIT.s),
    countryName: Joi.string().max(100),
    postcode: Joi.string().max(8),
    website: Joi.string().max(100), // TODO not validating URL format atm
    categories: Joi.array()
      .items(Joi.string().valid(...catalogCategory))
      .min(1),
    otherCategoryDescription: Joi.string().max(100),
    mainCategory: Joi.string().valid(...catalogCategory),
    areas: Joi.array()
      .items(Joi.string().valid(...catalogAreas))
      .min(1),
    careSettings: Joi.array()
      .items(Joi.string().valid(...catalogCareSettings))
      .min(1),
    otherCareSetting: Joi.string().max(100),
    mainPurpose: Joi.string().valid(...catalogMainPurpose),
    supportDescription: Joi.string().max(TEXTAREA_LENGTH_LIMIT.xl),
    currentlyReceivingSupport: Joi.string().max(TEXTAREA_LENGTH_LIMIT.xl),
    involvedAACProgrammes: Joi.array()
      .items(Joi.string().valid(...catalogInvolvedAACProgrammes))
      .min(1)
  })
    .required()
    .min(1),
  UNDERSTANDING_OF_NEEDS: Joi.object<DocumentType202304['UNDERSTANDING_OF_NEEDS']>({
    problemsTackled: Joi.string().max(TEXTAREA_LENGTH_LIMIT.l),
    howInnovationWork: Joi.string().max(TEXTAREA_LENGTH_LIMIT.l),
    benefitsOrImpact: Joi.array().items(Joi.string().max(TEXTAREA_LENGTH_LIMIT.xs)).min(1),
    impactDiseaseCondition: Joi.string().valid(...catalogYesNo),
    diseasesConditionsImpact: Joi.array().items(Joi.string().max(100)).min(1),
    estimatedCarbonReductionSavings: Joi.string().valid(...catalogYesNotYetNo),
    estimatedCarbonReductionSavingsDescription: Joi.string().max(TEXTAREA_LENGTH_LIMIT.xl),
    carbonReductionPlan: Joi.string().valid(...catalogCarbonReductionPlan),
    keyHealthInequalities: Joi.array()
      .items(Joi.string().valid(...catalogKeyHealthInequalities))
      .min(1),
    completedHealthInequalitiesImpactAssessment: Joi.string().valid(...catalogYesNo),
    hasProductServiceOrPrototype: Joi.string().valid(...catalogYesNo)
  })
    .required()
    .min(1),
  EVIDENCE_OF_EFFECTIVENESS: Joi.object<DocumentType202304['EVIDENCE_OF_EFFECTIVENESS']>({
    hasEvidence: Joi.string().valid(...catalogYesNotYet),
    currentlyCollectingEvidence: Joi.string().valid(...catalogYesNo),
    summaryOngoingEvidenceGathering: Joi.string().max(TEXTAREA_LENGTH_LIMIT.l),
    needsSupportAnyArea: Joi.array()
      .items(Joi.string().valid(...catalogNeedsSupportAnyArea))
      .min(1)
  })
    .required()
    .min(1),
  MARKET_RESEARCH: Joi.object<DocumentType202304['MARKET_RESEARCH']>({
    hasMarketResearch: Joi.string().valid(...catalogYesInProgressNotYet),
    marketResearch: Joi.string().max(TEXTAREA_LENGTH_LIMIT.l),
    optionBestDescribesInnovation: Joi.string().valid(...catalogOptionBestDescribesInnovation),
    whatCompetitorsAlternativesExist: Joi.string().max(TEXTAREA_LENGTH_LIMIT.l)
  })
    .required()
    .min(1),
  CURRENT_CARE_PATHWAY: Joi.object<DocumentType202304['CURRENT_CARE_PATHWAY']>({
    innovationPathwayKnowledge: Joi.string().valid(...catalogPathwayKnowledge),
    potentialPathway: Joi.string().max(TEXTAREA_LENGTH_LIMIT.m)
  })
    .required()
    .min(1),
  TESTING_WITH_USERS: Joi.object<DocumentType202304['TESTING_WITH_USERS']>({
    involvedUsersDesignProcess: Joi.string().valid(...catalogYesInProgressNotYet),
    testedWithIntendedUsers: Joi.string().valid(...catalogYesInProgressNotYet),
    intendedUserGroupsEngaged: Joi.array()
      .items(Joi.string().valid(...catalogIntendedUserGroupsEngaged))
      .min(1),
    otherIntendedUserGroupsEngaged: Joi.string().max(100),
    userTests: Joi.array()
      .items(
        Joi.object({
          kind: Joi.string().max(100),
          feedback: Joi.string().max(TEXTAREA_LENGTH_LIMIT.s)
        })
      )
      .min(1)
  })
    .required()
    .min(1),
  REGULATIONS_AND_STANDARDS: Joi.object<DocumentType202304['REGULATIONS_AND_STANDARDS']>({
    hasRegulationKnowledge: Joi.string().valid(...catalogHasRegulationKnowledge),
    standards: Joi.array()
      .items(
        Joi.object({
          type: Joi.string()
            .valid(...catalogStandardsType)
            .required(),
          hasMet: Joi.string().valid(...catalogYesInProgressNotYet)
        })
      )
      .min(1),
    otherRegulationDescription: Joi.string().max(100)
  })
    .required()
    .min(1),
  INTELLECTUAL_PROPERTY: Joi.object<DocumentType202304['INTELLECTUAL_PROPERTY']>({
    hasPatents: Joi.string().valid(...catalogHasPatents),
    patentNumbers: Joi.string().max(100),
    hasOtherIntellectual: Joi.string().valid(...catalogYesNo),
    otherIntellectual: Joi.string().max(100)
  })
    .required()
    .min(1),
  REVENUE_MODEL: Joi.object<DocumentType202304['REVENUE_MODEL']>({
    hasRevenueModel: Joi.string().valid(...catalogHasRevenueModel),
    revenues: Joi.array()
      .items(Joi.string().valid(...catalogRevenues))
      .min(1),
    otherRevenueDescription: Joi.string().max(100),
    payingOrganisations: Joi.string().max(TEXTAREA_LENGTH_LIMIT.m),
    benefittingOrganisations: Joi.string().max(TEXTAREA_LENGTH_LIMIT.m),
    hasFunding: Joi.string().valid(...catalogYesNoNotRelevant),
    fundingDescription: Joi.string().max(TEXTAREA_LENGTH_LIMIT.s)
  })
    .required()
    .min(1),
  COST_OF_INNOVATION: Joi.object<DocumentType202304['COST_OF_INNOVATION']>({
    hasCostKnowledge: Joi.string().valid(...catalogHasCostKnowledge),
    costDescription: Joi.string().max(TEXTAREA_LENGTH_LIMIT.m),
    patientsRange: Joi.string().valid(...catalogPatientRange),
    eligibilityCriteria: Joi.string().max(TEXTAREA_LENGTH_LIMIT.m),
    sellExpectations: Joi.string().max(TEXTAREA_LENGTH_LIMIT.s),
    usageExpectations: Joi.string().max(TEXTAREA_LENGTH_LIMIT.m),
    costComparison: Joi.string().valid(...catalogCostComparison)
  })
    .required()
    .min(1),
  DEPLOYMENT: Joi.object<DocumentType202304['DEPLOYMENT']>({
    hasDeployPlan: Joi.string().valid(...catalogYesNo),
    isDeployed: Joi.string().valid(...catalogYesNo),
    deploymentPlans: Joi.array().items(Joi.string().max(100)).min(1),
    commercialBasis: Joi.string().max(TEXTAREA_LENGTH_LIMIT.xl),
    organisationDeploymentAffect: Joi.string().max(TEXTAREA_LENGTH_LIMIT.xl),
    hasResourcesToScale: Joi.string().valid(...catalogYesNoNotSure)
  })
    .required()
    .min(1),
  evidences: Joi.array().items(EvidenceSchema202304).min(1)
};
