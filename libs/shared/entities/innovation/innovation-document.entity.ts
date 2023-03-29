import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';

import type { CarePathwayCatalogueEnum, ClinicalEvidenceTypeCatalogueEnum, CostComparisonCatalogueEnum, EnvironmentalBenefitCatalogueEnum, EvidenceTypeCatalogueEnum, GeneralBenefitCatalogueEnum, HasBenefitsCatalogueEnum, HasEvidenceCatalogueEnum, HasFundingCatalogueEnum, HasKnowledgeCatalogueEnum, HasMarketResearchCatalogueEnum, HasPatentsCatalogueEnum, HasProblemTackleKnowledgeCatalogueEnum, HasRegulationKnowledegeCatalogueEnum, HasResourcesToScaleCatalogueEnum, HasTestsCatalogueEnum, InnovationAreaCatalogueEnum, InnovationCareSettingCatalogueEnum, InnovationCategoryCatalogueEnum, InnovationCertificationCatalogueEnum, InnovationDiseasesConditionsImpactType, InnovationPathwayKnowledgeCatalogueEnum, InnovationRevenueTypeCatalogueEnum, InnovationSupportTypeCatalogueEnum, MainPurposeCatalogueEnum, StandardMetCatalogueEnum, SubgroupBenefitCatalogueEnum, YesNoNotRelevantCatalogueEnum, YesOrNoCatalogueEnum } from '../../enums';
import { BaseEntity } from '../base.entity';
import { InnovationEntity } from './innovation.entity';

export type EvidenceType = {
  evidenceType: EvidenceTypeCatalogueEnum;
  clinicalEvidenceType?: ClinicalEvidenceTypeCatalogueEnum;
  description?: string;
  summary?: string;
  files?: string[];
}

export type DocumentType2209 = {
  version: '202209';
  INNOVATION_DESCRIPTION: {
    name: string;
    description?: string;
    countryName?: string;
    postcode?: string;
    hasFinalProduct?: YesOrNoCatalogueEnum;
    categories?: InnovationCategoryCatalogueEnum[];
    otherCategoryDescription?: string;
    mainCategory?: InnovationCategoryCatalogueEnum;
    otherMainCategoryDescription?: string;
    areas?: InnovationAreaCatalogueEnum[];
    careSettings?: InnovationCareSettingCatalogueEnum[];
    otherCareSetting?: string;
    mainPurpose?: MainPurposeCatalogueEnum;
    supportTypes?: InnovationSupportTypeCatalogueEnum[];
    moreSupportDescription?: string;
  };
  VALUE_PROPOSITION?: {
    hasProblemTackleKnowledge?: HasProblemTackleKnowledgeCatalogueEnum;
    problemsTackled?: string;
    problemsConsequences?: string;
    intervention?: string;
    interventionImpact?: string;
  };
  UNDERSTANDING_OF_NEEDS?: {
    impactPatients?: boolean;
    impactClinicians?: boolean;
    subgroups: string[];
    cliniciansImpactDetails?: string;
    diseasesConditionsImpact?: InnovationDiseasesConditionsImpactType[];
  };
  UNDERSTANDING_OF_BENEFITS?: {
    hasBenefits?: HasBenefitsCatalogueEnum;
    patientsCitizensBenefits?: SubgroupBenefitCatalogueEnum[];
    otherPatientsCitizensBenefit?: string;
    generalBenefits?: GeneralBenefitCatalogueEnum[];
    otherGeneralBenefit?: string;
    environmentalBenefits?: EnvironmentalBenefitCatalogueEnum[];
    otherEnvironmentalBenefit?: string;
    accessibilityImpactDetails?: string;
    accessibilityStepsDetails?: string;
  };
  EVIDENCE_OF_EFFECTIVENESS?: {
    hasEvidence?: HasEvidenceCatalogueEnum;
    evidences?: EvidenceType[]
  };
  MARKET_RESEARCH?: {
    hasMarketResearch?: HasMarketResearchCatalogueEnum;
    marketResearch?: string
  };
  INTELLECTUAL_PROPERTY?: {
    hasPatents?: HasPatentsCatalogueEnum;
    hasOtherIntellectual?: YesOrNoCatalogueEnum;
    otherIntellectual?: string
  };
  REGULATIONS_AND_STANDARDS?: {
    hasRegulationKnowledge?: HasRegulationKnowledegeCatalogueEnum;
    otherRegulationDescription?: string;
    standards?: {
      type?: InnovationCertificationCatalogueEnum;
      hasMet?: StandardMetCatalogueEnum
    }[];
    files?: string[]
  };
  CURRENT_CARE_PATHWAY?: {
    hasUKPathwayKnowledge?: YesNoNotRelevantCatalogueEnum;
    innovationPathwayKnowledge?: InnovationPathwayKnowledgeCatalogueEnum;
    potentialPathway?: string;
    carePathway?: CarePathwayCatalogueEnum
  };
  TESTING_WITH_USERS?: {
    hasTests: HasTestsCatalogueEnum;
    userTests: {
      kind: string;
      feedback?: string
    }[];
    files?: string[]
  };
  COST_OF_INNOVATION?: {
    hasCostKnowledge?: HasKnowledgeCatalogueEnum;
    costDescription?: string;
    patientsRange?: string;
    sellExpectations?: string;
    usageExpectations?: string;
  };
  COMPARATIVE_COST_BENEFIT?: {
    hasCostSavingKnowledge?: HasKnowledgeCatalogueEnum;
    hasCostCareKnowledge?: HasKnowledgeCatalogueEnum;
    costComparison?: CostComparisonCatalogueEnum;
  };
  REVENUE_MODEL?: {
    hasRevenueModel?: YesOrNoCatalogueEnum;
    revenues?: InnovationRevenueTypeCatalogueEnum[];
    otherRevenueDescription?: string;
    payingOrganisations?: string;
    benefittingOrganisations?: string;
    hasFunding?: HasFundingCatalogueEnum;
    fundingDescription?: string;
  };
  IMPLEMENTATION_PLAN?: {
    hasDeployPlan?: YesOrNoCatalogueEnum;
    isDeployed?: YesOrNoCatalogueEnum;
    deploymentPlans?: {
      name: string;
      commercialBasis: string;
      orgDeploymentAffect: string;
    }[];
    hasResourcesToScale?: HasResourcesToScaleCatalogueEnum;
    files?: string[];
  };
};

export type DocumentType = DocumentType2209;


@Entity('innovation_document')
export class InnovationDocumentEntity extends BaseEntity {

  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string;

  @Column({ type: 'simple-json' })
  document: DocumentType;

  @Column({ name: 'is_snapshot' })
  isSnapshot: boolean;

  @Column({type: 'nvarchar', nullable: true })
  description: string | null;

  @OneToOne(() => InnovationEntity)
  @JoinColumn({ name: 'id' })
  innovation: InnovationEntity;

}

/**
 * creates a document with default information from an innovation
 * @param innovation the source innovation
 * @returns the document entity to be created
 */
export const createDocumentFromInnovation = (innovation: InnovationEntity): InnovationDocumentEntity => {
  return {
    id: innovation.id,
    document: {
      version: '202209',
      INNOVATION_DESCRIPTION: {
        name: innovation.name,
        description: innovation.description ?? undefined,
        countryName: innovation.countryName,
        postcode: innovation.postcode ?? undefined
      }
    },
    isSnapshot: false,
    description: 'Initial document',
    innovation: innovation,
    createdAt: innovation.createdAt,
    createdBy: innovation.createdBy,
    updatedAt: innovation.updatedAt,
    updatedBy: innovation.updatedBy,
    deletedAt: innovation.deletedAt
  };
};
