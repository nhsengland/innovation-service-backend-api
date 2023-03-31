import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { OrganisationEntity } from '../organisation/organisation.entity';
import { CommentEntity } from '../user/comment.entity';
import { NotificationEntity } from '../user/notification.entity';
import { UserEntity } from '../user/user.entity';
import { InnovationAreaEntity } from './innovation-area.entity';
import { InnovationAssessmentEntity } from './innovation-assessment.entity';
import { InnovationCareSettingEntity } from './innovation-care-setting.entity';
import { InnovationCategoryEntity } from './innovation-category.entity';
import { InnovationClinicalAreaEntity } from './innovation-clinical-area.entity';
import { InnovationDeploymentPlanEntity } from './innovation-deployment-plan.entity';
import { InnovationDiseaseConditionEntity } from './innovation-disease-condition.entity';
import { InnovationEnvironmentalBenefitEntity } from './innovation-environmental-benefit.entity';
import { InnovationEvidenceEntity } from './innovation-evidence.entity';
import { InnovationExportRequestEntity } from './innovation-export-request.entity';
import { InnovationGeneralBenefitEntity } from './innovation-general-benefit.entity';
import { InnovationPatientsCitizensBenefitEntity } from './innovation-patients-citizens-benefit.entity';
import { InnovationReassessmentRequestEntity } from './innovation-reassessment-request.entity';
import { InnovationRevenueEntity } from './innovation-revenue.entity';
import { InnovationSectionEntity } from './innovation-section.entity';
import { InnovationStandardEntity } from './innovation-standard.entity';
import { InnovationSubgroupEntity } from './innovation-subgroup.entity';
import { InnovationSupportTypeEntity } from './innovation-support-type.entity';
import { InnovationSupportEntity } from './innovation-support.entity';
import { InnovationUserTestEntity } from './innovation-user-test.entity';

import type {
  CarePathwayCatalogueEnum,
  CostComparisonCatalogueEnum,
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
  InnovationCategoryCatalogueEnum,
  InnovationPathwayKnowledgeCatalogueEnum,
  MainPurposeCatalogueEnum,
  YesNoNotRelevantCatalogueEnum,
  YesOrNoCatalogueEnum
} from '../../enums/catalog.enums';
import { InnovationStatusEnum } from '../../enums/innovation.enums';

import type { DateISOType } from '../../types/date.types';
import { InnovationGroupedStatusViewEntity } from '../views/innovation-grouped-status.view.entity';
import { InnovationCollaboratorEntity } from './innovation-collaborator.entity';
import { InnovationDocumentEntity } from './innovation-document.entity';
import { InnovationSupportLogEntity } from './innovation-support-log.entity';
import { InnovationTransferEntity } from './innovation-transfer.entity';

// TODO: after migration remove all "data" fields except for name, description, countryCode, postalcode

@Entity('innovation')
export class InnovationEntity extends BaseEntity {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'name', length: 100 })
  name: string;

  @Column({ type: 'simple-enum', enum: InnovationStatusEnum, nullable: false })
  status: InnovationStatusEnum;

  @Column({ name: 'status_updated_at', type: 'datetime2' })
  statusUpdatedAt: DateISOType;

  @Column({ name: 'expires_at', type: 'datetime2', nullable: true })
  expires_at: null | DateISOType;

  @Column({ name: 'survey_id', type: 'nvarchar', unique: true, nullable: true })
  surveyId: null | string;

  @Column({ name: 'description', type: 'nvarchar', nullable: true })
  description: null | string;

  @Column({ name: 'country_name', length: 100 })
  countryName: string;

  @Column({ name: 'postcode', type: 'nvarchar', nullable: true, length: 20 })
  postcode: null | string;

  @Column({ name: 'submitted_at', type: 'datetime2', nullable: true })
  submittedAt: null | DateISOType;

  @Column({ name: 'other_main_category_description', type: 'nvarchar', nullable: true })
  otherMainCategoryDescription: null | string;

  @Column({ name: 'other_category_description', type: 'nvarchar', nullable: true })
  otherCategoryDescription: null | string;

  @Column({ name: 'main_category', type: 'nvarchar', nullable: true })
  mainCategory: null | InnovationCategoryCatalogueEnum;

  @Column({ name: 'has_final_product', type: 'nvarchar', nullable: true })
  hasFinalProduct: null | YesOrNoCatalogueEnum;

  @Column({ name: 'main_purpose', type: 'nvarchar', nullable: true })
  mainPurpose: null | MainPurposeCatalogueEnum;

  @Column({ name: 'more_support_description', type: 'nvarchar', nullable: true })
  moreSupportDescription: null | string;

  @Column({ name: 'other_care_setting', type: 'nvarchar', length: 100, nullable: true })
  otherCareSetting: null | string;

  @Column({ name: 'has_problem_tackle_knowledge', type: 'nvarchar', nullable: true })
  hasProblemTackleKnowledge: null | HasProblemTackleKnowledgeCatalogueEnum;

  @Column({ name: 'problems_tackled', type: 'nvarchar', nullable: true })
  problemsTackled: null | string;

  @Column({ name: 'problems_consequences', type: 'nvarchar', nullable: true })
  problemsConsequences: null | string;

  @Column({ name: 'intervention', type: 'nvarchar', nullable: true })
  intervention: null | string;

  @Column({ name: 'intervention_impact', type: 'nvarchar', nullable: true })
  interventionImpact: null | string;

  @Column({ name: 'has_benefits', type: 'nvarchar', nullable: true })
  hasBenefits: null | HasBenefitsCatalogueEnum;

  @Column({ name: 'has_evidence', type: 'nvarchar', nullable: true })
  hasEvidence: null | HasEvidenceCatalogueEnum;

  @Column({ name: 'has_market_research', type: 'nvarchar', nullable: true })
  hasMarketResearch: null | HasMarketResearchCatalogueEnum;

  @Column({ name: 'market_research', type: 'nvarchar', nullable: true })
  marketResearch: null | string;

  @Column({ name: 'has_patents', type: 'nvarchar', nullable: true })
  hasPatents: null | HasPatentsCatalogueEnum;

  @Column({ name: 'has_other_intellectual', type: 'nvarchar', nullable: true })
  hasOtherIntellectual: null | YesOrNoCatalogueEnum;

  @Column({ name: 'other_intellectual', type: 'nvarchar', nullable: true })
  otherIntellectual: null | string;

  @Column({ name: 'impact_patients', nullable: true, default: false })
  impactPatients: boolean;

  @Column({ name: 'impact_clinicians', nullable: true, default: false })
  impactClinicians: boolean;

  @Column({ name: 'has_regulation_knowledge', type: 'nvarchar', nullable: true })
  hasRegulationKnowledge: null | HasRegulationKnowledegeCatalogueEnum;

  @Column({ name: 'other_regulation_description', type: 'nvarchar', nullable: true })
  otherRegulationDescription: null | string;

  @Column({ name: 'has_uk_pathway_knowledge', type: 'nvarchar', nullable: true })
  hasUKPathwayKnowledge: null | YesNoNotRelevantCatalogueEnum;

  @Column({ name: 'innovation_pathway_knowledge', type: 'nvarchar', nullable: true })
  innovationPathwayKnowledge: null | InnovationPathwayKnowledgeCatalogueEnum;

  @Column({ name: 'potential_pathway', type: 'nvarchar', nullable: true })
  potentialPathway: null | string;

  @Column({ name: 'has_tests', type: 'nvarchar', nullable: true })
  hasTests: null | HasTestsCatalogueEnum;

  @Column({ name: 'has_cost_knowledge', type: 'nvarchar', nullable: true })
  hasCostKnowledge: null | HasKnowledgeCatalogueEnum;

  @Column({ name: 'has_cost_saving_knowledge', type: 'nvarchar', nullable: true })
  hasCostSavingKnowledge: null | HasKnowledgeCatalogueEnum;

  @Column({ name: 'has_cost_care_knowledge', type: 'nvarchar', nullable: true })
  hasCostCareKnowledge: null | HasKnowledgeCatalogueEnum;

  @Column({ name: 'has_revenue_model', type: 'nvarchar', nullable: true })
  hasRevenueModel: null | YesOrNoCatalogueEnum;

  @Column({ name: 'other_revenue_description', type: 'nvarchar', nullable: true })
  otherRevenueDescription: null | string;

  @Column({ name: 'paying_organisations', type: 'nvarchar', nullable: true })
  payingOrganisations: null | string;

  @Column({ name: 'benefitting_organisations', type: 'nvarchar', nullable: true })
  benefittingOrganisations: null | string;

  @Column({ name: 'has_funding', type: 'nvarchar', nullable: true })
  hasFunding: null | HasFundingCatalogueEnum;

  @Column({ name: 'funding_description', type: 'nvarchar', nullable: true })
  fundingDescription: null | string;

  @Column({ name: 'has_deploy_plan', type: 'nvarchar', nullable: true })
  hasDeployPlan: null | YesOrNoCatalogueEnum;

  @Column({ name: 'is_deployed', type: 'nvarchar', nullable: true })
  isDeployed: null | YesOrNoCatalogueEnum;

  @Column({ name: 'has_resources_to_scale', type: 'nvarchar', nullable: true })
  hasResourcesToScale: null | HasResourcesToScaleCatalogueEnum;

  @Column({ name: 'cost_description', type: 'nvarchar', nullable: true })
  costDescription: null | string;

  @Column({ name: 'sell_expectations', type: 'nvarchar', nullable: true })
  sellExpectations: null | string;

  @Column({ name: 'usage_expectations', type: 'nvarchar', nullable: true })
  usageExpectations: null | string;

  @Column({ name: 'cost_comparison', type: 'nvarchar', nullable: true })
  costComparison: null | CostComparisonCatalogueEnum;

  @Column({ name: 'care_pathway', type: 'nvarchar', nullable: true })
  carePathway: null | CarePathwayCatalogueEnum;

  @Column({ name: 'patients_range', type: 'nvarchar', nullable: true })
  patientsRange: null | string;

  @Column({ name: 'clinicians_impact_details', type: 'nvarchar', nullable: true })
  cliniciansImpactDetails: null | string;

  @Column({ name: 'accessibility_impact_details', type: 'nvarchar', nullable: true })
  accessibilityImpactDetails: null | string;

  @Column({ name: 'accessibility_steps_details', type: 'nvarchar', nullable: true })
  accessibilityStepsDetails: null | string;

  @Column({ name: 'other_patients_citizens_benefit', type: 'nvarchar', nullable: true })
  otherPatientsCitizensBenefit: null | string;

  @Column({ name: 'other_general_benefit', type: 'nvarchar', nullable: true })
  otherGeneralBenefit: null | string;

  @Column({ name: 'other_environmental_benefit', type: 'nvarchar', nullable: true })
  otherEnvironmentalBenefit: null | string;

  @Column({ name: 'withdraw_reason', type: 'nvarchar', nullable: true })
  withdrawReason: null | string;

  @ManyToOne(() => UserEntity, { nullable: false })
  @JoinColumn({ name: 'owner_id' })
  owner: UserEntity;

  @ManyToMany(() => OrganisationEntity, record => record.innovationShares, { nullable: true, cascade: ['update'] })
  @JoinTable({
    name: 'innovation_share',
    joinColumn: {
      name: 'innovation_id',
      referencedColumnName: 'id'
    },
    inverseJoinColumn: {
      name: 'organisation_id',
      referencedColumnName: 'id'
    },
  })
  organisationShares: OrganisationEntity[];

  @OneToMany(() => InnovationAssessmentEntity, record => record.innovation, { cascade: ['insert', 'update'] })
  assessments: InnovationAssessmentEntity[];

  @OneToMany(() => InnovationSectionEntity, record => record.innovation, {
    lazy: true,
    cascade: ['insert', 'update']
  })
  sections: Promise<InnovationSectionEntity[]>;

  @OneToMany(() => InnovationSubgroupEntity, record => record.innovation, {
    lazy: true,
    cascade: ['insert', 'update']
  })
  subgroups: Promise<InnovationSubgroupEntity[]>;

  @OneToMany(() => InnovationAreaEntity, record => record.innovation, {
    lazy: true,
    cascade: ['insert', 'update']
  })
  areas: Promise<InnovationAreaEntity[]>;

  @OneToMany(() => InnovationCareSettingEntity, record => record.innovation, {
    lazy: true,
    cascade: ['insert', 'update']
  })
  careSettings: Promise<InnovationCareSettingEntity[]>;

  @OneToMany(() => InnovationCategoryEntity, record => record.innovation, {
    lazy: true,
    cascade: ['insert', 'update']
  })
  categories: Promise<InnovationCategoryEntity[]>;

  @OneToMany(() => InnovationClinicalAreaEntity, record => record.innovation, {
    lazy: true,
    cascade: ['insert', 'update']
  })
  clinicalAreas: Promise<InnovationClinicalAreaEntity[]>;

  @OneToMany(() => InnovationDeploymentPlanEntity, record => record.innovation, {
    lazy: true,
    cascade: ['insert', 'update']
  })
  deploymentPlans: Promise<InnovationDeploymentPlanEntity[]>;

  @OneToMany(() => InnovationEvidenceEntity, record => record.innovation, {
    lazy: true,
    cascade: ['insert', 'update']
  })
  evidences: Promise<InnovationEvidenceEntity[]>;

  @OneToMany(() => InnovationStandardEntity, record => record.innovation, {
    lazy: true,
    cascade: ['insert', 'update']
  })
  standards: Promise<InnovationStandardEntity[]>;

  @OneToMany(() => InnovationRevenueEntity, record => record.innovation, {
    lazy: true,
    cascade: ['insert', 'update']
  })
  revenues: Promise<InnovationRevenueEntity[]>;

  @OneToMany(() => InnovationUserTestEntity, record => record.innovation, {
    lazy: true,
    cascade: ['insert', 'update']
  })
  userTests: Promise<InnovationUserTestEntity[]>;

  @OneToMany(() => InnovationSupportTypeEntity, record => record.innovation, {
    lazy: true,
    cascade: ['insert', 'update'],
  })
  supportTypes: Promise<InnovationSupportTypeEntity[]>;

  @OneToMany(() => InnovationGeneralBenefitEntity, record => record.innovation, {
    lazy: true,
    cascade: ['insert', 'update']
  })
  generalBenefits: Promise<InnovationGeneralBenefitEntity[]>;

  @OneToMany(() => InnovationEnvironmentalBenefitEntity, record => record.innovation, {
    lazy: true,
    cascade: ['insert', 'update']
  })
  environmentalBenefits: Promise<InnovationEnvironmentalBenefitEntity[]>;

  @OneToMany(() => InnovationPatientsCitizensBenefitEntity, record => record.innovation, {
    lazy: true,
    cascade: ['insert', 'update']
  })
  patientsCitizensBenefits: Promise<InnovationPatientsCitizensBenefitEntity[]>;

  @OneToMany(() => InnovationDiseaseConditionEntity, record => record.innovation, {
    lazy: true,
    cascade: ['insert', 'update'],
  })
  diseasesConditionsImpact: Promise<InnovationDiseaseConditionEntity[]>;

  @OneToMany(() => CommentEntity, record => record.innovation, { lazy: true })
  comments: Promise<CommentEntity[]>;

  @OneToMany(() => InnovationSupportEntity, record => record.innovation, { cascade: ['insert', 'update'] })
  innovationSupports: InnovationSupportEntity[];

  @OneToMany(() => InnovationSupportLogEntity, record => record.innovation, { cascade: ['insert', 'update'] })
  innovationSupportLogs: InnovationSupportLogEntity[];

  @OneToMany(() => NotificationEntity, record => record.innovation, { lazy: true, cascade: ['insert', 'update'] })
  notifications: Promise<NotificationEntity[]>;

  @OneToMany(() => InnovationReassessmentRequestEntity, record => record.innovation, { lazy: true, cascade: ['insert', 'update'] })
  reassessmentRequests: Promise<InnovationReassessmentRequestEntity[]>;

  @OneToMany(() => InnovationExportRequestEntity, record => record.innovation, { lazy: true, cascade: ['insert', 'update'] })
  exportRequests: Promise<InnovationExportRequestEntity[]>;

  @OneToOne(() => InnovationGroupedStatusViewEntity, record => record.innovation)
  innovationGroupedStatus: InnovationGroupedStatusViewEntity;

  @OneToMany(() => InnovationCollaboratorEntity, record => record.innovation)
  collaborators: InnovationCollaboratorEntity[];

  @OneToOne(() => InnovationDocumentEntity)
  @JoinColumn({ name: 'id' })
  document: InnovationDocumentEntity;
  
  @OneToMany(() => InnovationTransferEntity, record => record.innovation)
  transfers: InnovationTransferEntity[];

  static new(data: Partial<InnovationEntity>): InnovationEntity {
    const instance = new InnovationEntity();
    Object.assign(instance, data);
    return instance;
  }

}
