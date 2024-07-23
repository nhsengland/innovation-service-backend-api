import { randBoolean, randCountry, randProduct, randText } from '@ngneat/falso';
import type { ElasticSearchDocumentType } from './elastic-search.schema';
import { EvidenceSchema } from './document.schema';
import type { InnovationRecordDocumentType } from './document.types';

// All versions
export type DocumentType = InnovationRecordDocumentType;

// Current version links
export * as CurrentCatalogTypes from './catalog.types';
export { ElasticSearchSchema } from './elastic-search.schema';
export type CurrentElasticSearchDocumentType = ElasticSearchDocumentType;
export type CurrentDocumentType = InnovationRecordDocumentType;
export type CurrentEvidenceType = NonNullable<CurrentDocumentType['evidences']>[number];
export const CurrentEvidenceSchema = EvidenceSchema;

export { InnovationRecordDocumentType, requiredSectionsAndQuestions } from './document.types';

// To remove?
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
  DEPLOYMENT = 'D'
}

// Maybe move this to a separate file
export const createSampleDocument = (data?: {
  name?: string;
  description?: string;
  countryName?: string;
  postcode?: string;
}): CurrentDocumentType => {
  return {
    version: 202304, // TODO: DC Change this
    INNOVATION_DESCRIPTION: {
      name: data?.name ?? randProduct().title,
      description: data?.description ?? randProduct().description,
      countryName: data?.countryName ?? randCountry(),
      officeLocation: 'Based outside UK',
      countryLocation: data?.countryName ?? randCountry(),
      postcode: data?.postcode ?? undefined,

      areas: ['COVID_19'],
      careSettings: ['INDUSTRY'],
      categories: ['MEDICAL_DEVICE', 'AI'],
      mainCategory: 'MEDICAL_DEVICE',
      mainPurpose: 'MONITOR_CONDITION',
      otherCareSetting: randText(),
      otherCategoryDescription: randText()
    },
    UNDERSTANDING_OF_NEEDS: {
      benefitsOrImpact: [randText()],
      carbonReductionPlan: randBoolean() ? 'YES' : 'NO',
      completedHealthInequalitiesImpactAssessment: randBoolean() ? 'YES' : 'NO',
      diseasesConditionsImpact: [randText()],
      estimatedCarbonReductionSavings: randBoolean() ? 'YES' : 'NO',
      estimatedCarbonReductionSavingsDescription: randText(),
      howInnovationWork: randText(),
      impactDiseaseCondition: randBoolean() ? 'YES' : 'NO',
      keyHealthInequalities: ['NONE'],
      problemsTackled: randBoolean() ? 'YES' : 'NO',
      hasProductServiceOrPrototype: randBoolean() ? 'YES' : 'NO'
    },
    EVIDENCE_OF_EFFECTIVENESS: {
      hasEvidence: randBoolean() ? 'YES' : 'NOT_YET',
      currentlyCollectingEvidence: randBoolean() ? 'YES' : 'NO',
      needsSupportAnyArea: ['CONFIDENTIAL_PATIENT_DATA'],
      summaryOngoingEvidenceGathering: randText()
    },
    MARKET_RESEARCH: {
      hasMarketResearch: randBoolean() ? 'YES' : 'NOT_YET',
      marketResearch: randText()
    },
    CURRENT_CARE_PATHWAY: {
      innovationPathwayKnowledge: randBoolean() ? 'PATHWAY_EXISTS_AND_FITS' : 'NO_PATHWAY',
      potentialPathway: randText()
    },
    TESTING_WITH_USERS: {
      userTests: []
    },
    REGULATIONS_AND_STANDARDS: {
      hasRegulationKnowledge: randBoolean() ? 'YES_ALL' : 'NO',
      otherRegulationDescription: randText(),
      standards: [{ type: 'CE_UKCA_CLASS_I', hasMet: 'IN_PROGRESS' }]
    },
    INTELLECTUAL_PROPERTY: {
      hasOtherIntellectual: randBoolean() ? 'YES' : 'NO',
      hasPatents: randBoolean() ? 'HAS_AT_LEAST_ONE' : 'HAS_NONE',
      otherIntellectual: randText()
    },
    REVENUE_MODEL: {
      benefittingOrganisations: randText(),
      fundingDescription: randText(),
      hasFunding: randBoolean() ? 'YES' : 'NO',
      hasRevenueModel: randBoolean() ? 'YES' : 'NO',
      otherRevenueDescription: randText(),
      payingOrganisations: randText(),
      revenues: []
    },
    COST_OF_INNOVATION: {
      costDescription: randText(),
      hasCostKnowledge: randBoolean() ? 'DETAILED_ESTIMATE' : 'ROUGH_IDEA',
      patientsRange: 'NOT_SURE',
      sellExpectations: randText(),
      usageExpectations: randText()
    },
    DEPLOYMENT: {
      deploymentPlans: [],
      hasDeployPlan: randBoolean() ? 'YES' : 'NO',
      hasResourcesToScale: randBoolean() ? 'YES' : 'NO',
      isDeployed: randBoolean() ? 'YES' : 'NO'
    },
    evidences: []
  };
};
