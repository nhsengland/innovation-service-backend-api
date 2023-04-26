import type * as Document202209Catalog from '../202209/catalog.types';
import type { DocumentType202209 } from '../202209/document.types';
import type * as Document202304Catalog from './catalog.types';
import type { DocumentType202304 } from './document.types';

const migrateCategory = (
  category?: Document202209Catalog.catalogCategory
): Document202304Catalog.catalogCategory | undefined => {
  switch (category) {
    // only new options added so nothing to do
    default:
      return category;
  }
};

const migrateAreas = (
  areas?: Document202209Catalog.catalogAreas
): Document202304Catalog.catalogAreas | undefined => {
  switch (areas) {
    case 'DIGITALLY_ENABLING_PRIMARY_CARE':
      return 'DIGITALISING_SYSTEM';
    case 'WORKFORCE':
    case 'ECONOMIC_GROWTH':
    case 'EVIDENCE_GENERATION':
    case 'TRANSFORMED_OUT_OF_HOSPITAL_CARE':
    case 'REDUCIND_PRESSURE_EMERGENCY_HOSPITAL_SERVICES':
    case 'CONTROL_OVER_THEIR_OWN_HEALTH':
    case 'CANCER':
    case 'MENTAL_HEALTH':
    case 'CHILDREN_AND_YOUNG_PEOPLE':
    case 'LEARNING_DISABILITIES_AND_AUTISM':
    case 'CARDIOVASCULAR_DISEASE':
    case 'STROKE_CARE':
    case 'DIABETES':
    case 'RESPIRATORY':
    case 'RESEARCH_INNOVATION_DRIVE_FUTURE_OUTCOMES':
    case 'GENOMICS':
    case 'WIDER_SOCIAL_IMPACT':
    case 'REDUCING_VARIATION_ACROSS_HEALTH_SYSTEM':
    case 'FINANCIAL_PLANNING_ASSUMPTIONS':
    case 'GREATER_SUPPORT_AND_RESOURCE_PRIMARY_CARE':
      return undefined;
    default:
      return areas;
  }
};

const migrateCareSettings = (
  careSettings?: Document202209Catalog.catalogCareSettings
): Document202304Catalog.catalogCareSettings | undefined => {
  switch (careSettings) {
    case 'STP_ICS':
      return 'ICS';
    case 'CCGS':
    case 'COMMUNITY':
    case 'DOMICILIARY_CARE':
      return undefined;
    default:
      return careSettings;
  }
};

const migrateMainPurpose = (
  mainPurpose?: Document202209Catalog.catalogMainPurpose
): Document202304Catalog.catalogMainPurpose | undefined => {
  switch (mainPurpose) {
    // only new options added so nothing to do
    default:
      return mainPurpose;
  }
};

// Remove the partial
export const upgradeDocumentTo202304 = (original: DocumentType202209): DocumentType202304 => {
  return {
    version: '202304',
    INNOVATION_DESCRIPTION: {
      name: original.INNOVATION_DESCRIPTION?.name,
      description: original.INNOVATION_DESCRIPTION?.description,
      postcode: original.INNOVATION_DESCRIPTION?.postcode,
      countryName: original.INNOVATION_DESCRIPTION?.countryName,
      categories: original.INNOVATION_DESCRIPTION?.categories
        ?.map(migrateCategory)
        .filter((u): u is Document202304Catalog.catalogCategory => u !== undefined),
      otherCategoryDescription: original.INNOVATION_DESCRIPTION?.otherCategoryDescription,
      mainCategory: migrateCategory(original.INNOVATION_DESCRIPTION?.mainCategory),
      areas: original.INNOVATION_DESCRIPTION?.areas
        ?.map(migrateAreas)
        .filter((u): u is Document202304Catalog.catalogAreas => u !== undefined),
      careSettings: original.INNOVATION_DESCRIPTION?.careSettings
        ?.map(migrateCareSettings)
        .filter((u): u is Document202304Catalog.catalogCareSettings => u !== undefined),
      otherCareSetting: original.INNOVATION_DESCRIPTION?.otherCareSetting,
      mainPurpose: migrateMainPurpose(original.INNOVATION_DESCRIPTION?.mainPurpose),
      supportDescription: original.INNOVATION_DESCRIPTION?.moreSupportDescription,
    },
    UNDERSTANDING_OF_NEEDS: {
      problemsTackled: original.VALUE_PROPOSITION?.problemsTackled,
      diseasesConditionsImpact: original.UNDERSTANDING_OF_NEEDS?.diseasesConditionsImpact,
    },
    EVIDENCE_OF_EFFECTIVENESS: {
      hasEvidence: original.EVIDENCE_OF_EFFECTIVENESS?.hasEvidence === 'YES' ? 'YES' : 'NOT_YET',
    },
    MARKET_RESEARCH: {
      hasMarketResearch: original.MARKET_RESEARCH?.hasMarketResearch,
      marketResearch: original.MARKET_RESEARCH?.marketResearch,
    },
    CURRENT_CARE_PATHWAY: {
      innovationPathwayKnowledge: original.CURRENT_CARE_PATHWAY?.innovationPathwayKnowledge,
      potentialPathway: original.CURRENT_CARE_PATHWAY?.potentialPathway,
    },
    TESTING_WITH_USERS: {
      testedWithIntendedUsers: original.TESTING_WITH_USERS?.hasTests,
      userTests: original.TESTING_WITH_USERS?.userTests,
      files: original.TESTING_WITH_USERS?.files,
    },
    REGULATIONS_AND_STANDARDS: original.REGULATIONS_AND_STANDARDS ?? {},
    INTELLECTUAL_PROPERTY: original.INTELLECTUAL_PROPERTY ?? {},
    REVENUE_MODEL: original.REVENUE_MODEL ?? {},
    COST_OF_INNOVATION: {
      ...original.COST_OF_INNOVATION,
      costComparison: original.COMPARATIVE_COST_BENEFIT?.costComparison,
    },
    DEPLOYMENT: {
      ...original.IMPLEMENTATION_PLAN,
      deploymentPlans: original.IMPLEMENTATION_PLAN?.deploymentPlans?.map((plan) => plan.name),
    },
    evidences: original.EVIDENCE_OF_EFFECTIVENESS?.evidences?.map((evidence) => ({
      evidenceSubmitType:
        evidence.evidenceType === 'OTHER'
          ? 'OTHER_EFFECTIVENESS'
          : evidence.evidenceType === 'CLINICAL'
          ? 'CLINICAL_OR_CARE'
          : 'COST_IMPACT_OR_ECONOMIC',
      evidenceType: evidence.clinicalEvidenceType,
      description: evidence.description,
      summary: evidence.summary ?? '', // Don't believe this is possible but TS doesn't know that because of previous schema, if it was null then we just set it to empty string
      files: evidence.files ?? [],
    })),
  };
};
