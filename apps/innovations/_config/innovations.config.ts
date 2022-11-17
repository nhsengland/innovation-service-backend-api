import Joi from 'joi';

import {
  CarePathwayCatalogueEnum,
  CostComparisonCatalogueEnum,
  EnvironmentalBenefitCatalogueEnum,
  GeneralBenefitCatalogueEnum,
  HasBenefitsCatalogueEnum,
  HasEvidenceCatalogueEnum,
  HasFundingCatalogueEnum,
  HasKnowledgeCatalogueEnum,
  HasMarketResearchCatalogueEnum,
  HasPatentsCatalogueEnum,
  HasProblemTackleKnowledgeCatalogueEnum,
  HasRegulationKnowledegeCatalogueEnum,
  HasResourcesToScaleCatalogueEnum,
  HasTestsCatalogueEnum,
  InnovationAreaCatalogueEnum,
  InnovationCareSettingCatalogueEnum,
  InnovationCategoryCatalogueEnum,
  InnovationCertificationCatalogueEnum,
  InnovationDiseaseConditionCatalogueEnum,
  InnovationPathwayKnowledgeCatalogueEnum,
  InnovationRevenueTypeCatalogueEnum,
  InnovationSectionEnum,
  InnovationSupportTypeCatalogueEnum,
  MainPurposeCatalogueEnum,
  PatientRangeCatalogueEnum,
  StandardMetCatalogueEnum,
  SubgroupBenefitCatalogueEnum,
  YesNoNotRelevantCatalogueEnum,
  YesOrNoCatalogueEnum
} from '@innovations/shared/enums';

import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';

import { InnovationLocationEnum, InnovationStatisticsEnum } from '../_enums/innovation.enums';
import type { BaseHandler } from '../_handlers/base.handler';
import { ActionsToSubmitStatisticsHandler } from '../_handlers/actions-to-submit.handler';
import { SectionsSubmittedStatisticsHandler } from '../_handlers/sections-submitted.handler';
import { UnreadMessagesStatisticsHandler } from '../_handlers/unread-messages.handler';


export const INNOVATION_SECTIONS_CONFIG: { [key in InnovationSectionEnum]: {
  innovationFields: string[],
  lookupTables?: string[],
  allowFileUploads?: boolean,
  innovationDependencies?: {
    table: string,
    fields: string[],
    lookupTables?: string[]
  }[],
  validation: Joi.ObjectSchema
} } = {

  INNOVATION_DESCRIPTION: {
    innovationFields: ['description', 'hasFinalProduct', 'otherCategoryDescription', 'mainPurpose', 'mainCategory', 'otherMainCategoryDescription', 'moreSupportDescription', 'otherCareSetting', 'name', 'countryName', 'postcode'],
    lookupTables: ['categories', 'areas', 'careSettings', 'supportTypes'],
    validation: Joi.object({
      name: Joi.string().max(100).trim(),
      description: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium),
      location: Joi.string().valid(...Object.values(InnovationLocationEnum)),
      countryName: Joi.string(),
      postcode: Joi.string().allow(null),
      hasFinalProduct: Joi.string().valid(...Object.values(YesOrNoCatalogueEnum)).allow(null),
      categories: Joi.array().items(Joi.string().valid(...Object.values(InnovationCategoryCatalogueEnum))),
      otherCategoryDescription: Joi.string().allow(null),
      mainCategory: Joi.string().valid(...Object.values(InnovationCategoryCatalogueEnum)).allow(null),
      otherMainCategoryDescription: Joi.string().allow(null),
      areas: Joi.array().items(Joi.string().valid(...Object.values(InnovationAreaCatalogueEnum))),
      careSettings: Joi.array().items(Joi.string().valid(...Object.values(InnovationCareSettingCatalogueEnum))),
      otherCareSetting: Joi.string().max(100).allow(null),
      mainPurpose: Joi.string().valid(...Object.values(MainPurposeCatalogueEnum)).allow(null),
      supportTypes: Joi.array().items(Joi.string().valid(...Object.values(InnovationSupportTypeCatalogueEnum))),
      moreSupportDescription: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium).allow(null)
    }).required().min(1)
  },

  VALUE_PROPOSITION: {
    innovationFields: ['hasProblemTackleKnowledge', 'problemsTackled', 'problemsConsequences', 'intervention', 'interventionImpact'],
    validation: Joi.object({
      hasProblemTackleKnowledge: Joi.string().valid(...Object.values(HasProblemTackleKnowledgeCatalogueEnum)).optional(),
      problemsTackled: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium).allow(null).optional(),
      problemsConsequences: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium).allow(null).optional(),
      intervention: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium).allow(null).optional(),
      interventionImpact: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium).allow(null).optional()
    }).required().min(1)
  },

  UNDERSTANDING_OF_NEEDS: {
    innovationFields: ['impactPatients', 'impactClinicians', 'cliniciansImpactDetails'],
    lookupTables: ['diseasesConditionsImpact'],
    innovationDependencies: [{
      table: 'subgroups',
      fields: ['id', 'name', 'conditions'] // 'conditions' and 'otherCondition' field on DB is not being used for now!
    }],
    validation: Joi.object({
      impactPatients: Joi.boolean().strict(),
      impactClinicians: Joi.boolean().strict(),
      subgroups: Joi.array().items(
        Joi.object({
          id: Joi.string().guid().allow(null).required(),
          name: Joi.string().required()
        })),
      cliniciansImpactDetails: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium).allow(null),
      diseasesConditionsImpact: Joi.array().items(Joi.string().valid(...Object.values(InnovationDiseaseConditionCatalogueEnum))).allow(null),
    }).required().min(1)
  },

  UNDERSTANDING_OF_BENEFITS: {
    innovationFields: ['hasBenefits', 'accessibilityImpactDetails', 'accessibilityStepsDetails', 'otherGeneralBenefit', 'otherEnvironmentalBenefit', 'otherPatientsCitizensBenefit'],
    lookupTables: ['generalBenefits', 'environmentalBenefits', 'patientsCitizensBenefits'],
    validation: Joi.object({
      hasBenefits: Joi.string().valid(...Object.values(HasBenefitsCatalogueEnum)),
      patientsCitizensBenefits: Joi.array().items(Joi.string().valid(...Object.values(SubgroupBenefitCatalogueEnum))).allow(null),
      otherPatientsCitizensBenefit: Joi.string().allow(null),
      generalBenefits: Joi.array().items(Joi.string().valid(...Object.values(GeneralBenefitCatalogueEnum))).min(1).max(3).allow(null),
      otherGeneralBenefit: Joi.string().allow(null),
      environmentalBenefits: Joi.array().items(Joi.string().valid(...Object.values(EnvironmentalBenefitCatalogueEnum))).min(1).max(3).allow(null),
      otherEnvironmentalBenefit: Joi.string().allow(null),
      accessibilityImpactDetails: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium).allow(null),
      accessibilityStepsDetails: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium).allow(null)
    }).required().min(1)
  },

  EVIDENCE_OF_EFFECTIVENESS: {
    innovationFields: ['hasEvidence'],
    innovationDependencies: [ // Evidences are only retrieved, not updated trought this section.
      {
        table: 'evidences',
        fields: ['id', 'evidenceType', 'clinicalEvidenceType', 'description', 'summary', 'files']
      }
    ],
    validation: Joi.object({
      hasEvidence: Joi.string().valid(...Object.values(HasEvidenceCatalogueEnum))
    }).required().min(1)
  },

  MARKET_RESEARCH: {
    innovationFields: ['marketResearch', 'hasMarketResearch'],
    validation: Joi.object({
      hasMarketResearch: Joi.string().valid(...Object.values(HasMarketResearchCatalogueEnum)),
      marketResearch: Joi.string().allow(null)
    }).required().min(1)
  },

  INTELLECTUAL_PROPERTY: {
    innovationFields: ['hasPatents', 'hasOtherIntellectual', 'otherIntellectual'],
    validation: Joi.object({
      hasPatents: Joi.string().valid(...Object.values(HasPatentsCatalogueEnum)),
      hasOtherIntellectual: Joi.string().valid(...Object.values(YesOrNoCatalogueEnum)).allow(null),
      otherIntellectual: Joi.string().allow(null)
    }).required().min(1)
  },

  REGULATIONS_AND_STANDARDS: {
    innovationFields: ['hasRegulationKnowledge', 'otherRegulationDescription'],
    allowFileUploads: true,
    innovationDependencies: [
      {
        table: 'standards',
        fields: ['id', 'type', 'hasMet']
      }
    ],
    validation: Joi.object({
      hasRegulationKnowledge: Joi.string().valid(...Object.values(HasRegulationKnowledegeCatalogueEnum)),
      standards: Joi.array().items(Joi.object({
        id: Joi.string().guid().allow(null).required(),
        type: Joi.string().valid(...Object.values(InnovationCertificationCatalogueEnum)).required(),
        hasMet: Joi.string().valid(...Object.values(StandardMetCatalogueEnum)).allow(null)
      })),
      otherRegulationDescription: Joi.string().allow(null),
      files: Joi.array().items(Joi.string().guid())
    }).required().min(1)
  },

  CURRENT_CARE_PATHWAY: {
    innovationFields: ['hasUKPathwayKnowledge', 'innovationPathwayKnowledge', 'potentialPathway', 'carePathway'],
    validation: Joi.object({
      hasUKPathwayKnowledge: Joi.string().valid(...Object.values(YesNoNotRelevantCatalogueEnum)),
      innovationPathwayKnowledge: Joi.string().valid(...Object.values(InnovationPathwayKnowledgeCatalogueEnum)).allow(null),
      potentialPathway: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium).allow(null),
      carePathway: Joi.string().valid(...Object.values(CarePathwayCatalogueEnum)).allow(null)
    }).required().min(1)
  },

  TESTING_WITH_USERS: {
    innovationFields: ['hasTests'],
    allowFileUploads: true,
    innovationDependencies: [{
      table: 'userTests',
      fields: ['id', 'kind', 'feedback']
    }],
    validation: Joi.object({
      hasTests: Joi.string().valid(...Object.values(HasTestsCatalogueEnum)),
      userTests: Joi.array().items(Joi.object({
        id: Joi.string().guid().allow(null).required(),
        kind: Joi.string(),
        feedback: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium).allow(null)
      })),
      files: Joi.array().items(Joi.string().guid())
    }).required().min(1)
  },

  COST_OF_INNOVATION: {
    innovationFields: ['hasCostKnowledge', 'costDescription', 'patientsRange', 'sellExpectations', 'usageExpectations'],
    validation: Joi.object({
      hasCostKnowledge: Joi.string().valid(...Object.values(HasKnowledgeCatalogueEnum)),
      costDescription: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium).allow(null),
      patientsRange: Joi.array().items(Joi.string().valid(...Object.values(PatientRangeCatalogueEnum))).allow(null),
      sellExpectations: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium).allow(null),
      usageExpectations: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium).allow(null)
    }).required().min(1)
  },

  COMPARATIVE_COST_BENEFIT: {
    innovationFields: ['hasCostSavingKnowledge', 'hasCostCareKnowledge', 'costComparison'],
    validation: Joi.object({
      hasCostSavingKnowledge: Joi.string().valid(...Object.values(HasKnowledgeCatalogueEnum)),
      hasCostCareKnowledge: Joi.string().valid(...Object.values(HasKnowledgeCatalogueEnum)).allow(null),
      costComparison: Joi.string().valid(...Object.values(CostComparisonCatalogueEnum)).allow(null),
    }).required().min(1)
  },

  REVENUE_MODEL: {
    innovationFields: ['hasRevenueModel', 'payingOrganisations', 'benefittingOrganisations', 'hasFunding', 'fundingDescription', 'otherRevenueDescription'],
    lookupTables: ['revenues'],
    validation: Joi.object({
      hasRevenueModel: Joi.string().valid(...Object.values(YesOrNoCatalogueEnum)),
      revenues: Joi.array().items(Joi.string().valid(...Object.values(InnovationRevenueTypeCatalogueEnum))),
      otherRevenueDescription: Joi.string().allow(null),
      payingOrganisations: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium).allow(null),
      benefittingOrganisations: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium).allow(null),
      hasFunding: Joi.string().valid(...Object.values(HasFundingCatalogueEnum)).allow(null),
      fundingDescription: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium).allow(null)
    }).required().min(1)
  },

  IMPLEMENTATION_PLAN: {
    innovationFields: ['hasDeployPlan', 'isDeployed', 'hasResourcesToScale'],
    allowFileUploads: true,
    innovationDependencies: [{
      table: 'deploymentPlans',
      fields: ['id', 'name', 'commercialBasis', 'orgDeploymentAffect']
    }],
    validation: Joi.object({
      hasDeployPlan: Joi.string().valid(...Object.values(YesOrNoCatalogueEnum)),
      isDeployed: Joi.string().valid(...Object.values(YesOrNoCatalogueEnum)).allow(null),
      deploymentPlans: Joi.array().items(
        Joi.object({
          id: Joi.string().guid().allow(null).required(),
          name: Joi.string().required(),
          commercialBasis: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium).allow(null),
          orgDeploymentAffect: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium).allow(null)
        })),
      hasResourcesToScale: Joi.string().valid(...Object.values(HasResourcesToScaleCatalogueEnum)).allow(null),
      files: Joi.array().items(Joi.string().guid())
    }).required().min(1)
  }
};

export const INNOVATION_STATISTICS_CONFIG: Record<keyof typeof InnovationStatisticsEnum, {
  handler: { new(...args: any[]): BaseHandler<InnovationStatisticsEnum> },
}>  = {
  [InnovationStatisticsEnum.ACTIONS_TO_SUBMIT]: {
    handler: ActionsToSubmitStatisticsHandler,
  },
  [InnovationStatisticsEnum.SECTIONS_SUBMITTED]: {
    handler: SectionsSubmittedStatisticsHandler,
  },
  [InnovationStatisticsEnum.UNREAD_MESSAGES]: {
    handler: UnreadMessagesStatisticsHandler,
  },
}
