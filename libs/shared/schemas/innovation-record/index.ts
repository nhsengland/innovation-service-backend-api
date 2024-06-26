import { randBoolean, randCountry, randProduct, randText } from '@ngneat/falso';
import { ElasticSearchDocumentType202304, ElasticSearchSchema202304 } from './202304/elastic-search.schema';
import type { DocumentType202209 } from './202209/document.types';
import { DocumentValidationSchema202304Map, EvidenceSchema202304 } from './202304/document.schema';
import type { DocumentType202304 } from './202304/document.types';

// All versions
export type DocumentType = DocumentType202209 | DocumentType202304;
export const DocumentVersions = ['202209', '202304'] as const;
export type DocumentVersions = (typeof DocumentVersions)[number];

// Current version links
export * as CurrentCatalogTypes from './202304/catalog.types';
export * as CurrentDocumentConfig from './202304/document.config';
export const ElasticSearchSchema = ElasticSearchSchema202304;
export type CurrentElasticSearchDocumentType = ElasticSearchDocumentType202304;
export const CurrentDocumentSchemaMap = DocumentValidationSchema202304Map;
export type CurrentDocumentType = DocumentType202304;
export type CurrentEvidenceType = NonNullable<CurrentDocumentType['evidences']>[number];
export const CurrentEvidenceSchema = EvidenceSchema202304;

// Helpers
export type DocumentTypeFromVersion<V extends DocumentType['version']> = V extends '202304'
  ? CurrentDocumentType
  : V extends '202209'
    ? DocumentType202209
    : never;

// Maybe move this to a separate file
export const createSampleDocument = (data?: {
  name?: string;
  description?: string;
  countryName?: string;
  postcode?: string;
}): CurrentDocumentType => {
  return {
    version: '202304',
    INNOVATION_DESCRIPTION: {
      name: data?.name ?? randProduct().title,
      description: data?.description ?? randProduct().description,
      countryName: data?.countryName ?? randCountry(),
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
