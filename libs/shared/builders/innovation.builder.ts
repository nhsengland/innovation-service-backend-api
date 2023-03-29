import { randBoolean, randCountry, randNumber, randProduct, randText, randUuid, randZipCode } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';
import { InnovationEntity, type InnovationSectionEntity, type InnovationSupportEntity, type OrganisationUnitEntity, type OrganisationUnitUserEntity, type UserEntity } from '../entities';
import { createDocumentFromInnovation, DocumentType, InnovationDocumentEntity } from '../entities/innovation/innovation-document.entity';
import { CarePathwayCatalogueEnum, CostComparisonCatalogueEnum, HasBenefitsCatalogueEnum, HasEvidenceCatalogueEnum, HasFundingCatalogueEnum, HasKnowledgeCatalogueEnum, HasMarketResearchCatalogueEnum, HasPatentsCatalogueEnum, HasProblemTackleKnowledgeCatalogueEnum, HasRegulationKnowledegeCatalogueEnum, HasResourcesToScaleCatalogueEnum, HasTestsCatalogueEnum, InnovationAreaCatalogueEnum, InnovationCareSettingCatalogueEnum, InnovationCategoryCatalogueEnum, InnovationCertificationCatalogueEnum, InnovationPathwayKnowledgeCatalogueEnum, InnovationStatusEnum, InnovationSupportStatusEnum, InnovationSupportTypeCatalogueEnum, MainPurposeCatalogueEnum, ServiceRoleEnum, StandardMetCatalogueEnum, YesNoNotRelevantCatalogueEnum, YesOrNoCatalogueEnum } from '../enums';
import type { DomainContextType } from '../types';
import { InnovationActionBuilder } from './innovation-action.builder';
import { InnovationAssessmentBuilder } from './innovation-assessment.builder';
import { InnovationReassessmentBuilder } from './innovation-reassessment.builder';
import { InnovationSectionBuilder } from './innovation-section.builder';
import { InnovationSupportBuilder } from './innovation-support.builder';

export class InnovationBuilder {

  innovation: Partial<InnovationEntity> = {};

  private _withSections = false;
  private _withSupports = false;
  private _withSupportsAndAccessors = false;
  private _withActions = false;
  private _withActionCreatedBy: DomainContextType;
  private _withAssessments = false;
  private _withReassessment: boolean;

  private _organisationUnit: OrganisationUnitEntity;
  private _organisationUnitUsers: OrganisationUnitUserEntity[];
  private _assessmentUser: UserEntity;
  private _document: DocumentType;
  

  constructor() {
    this.innovation = {
      name: randProduct().title,
      description: randText(),
      countryName: randCountry(),
      postcode: randZipCode(),
      surveyId: randUuid(),
      status: InnovationStatusEnum.IN_PROGRESS,
      assessments: [],
      createdAt: new Date().toISOString(),
    };

    this._document = {
      version: '202209',
      INNOVATION_DESCRIPTION: {
        name: this.innovation.name!,
        description: this.innovation.description!,
        countryName: this.innovation.countryName,
        postcode: this.innovation.postcode!,
        
        areas: [InnovationAreaCatalogueEnum.CANCER],
        careSettings: [InnovationCareSettingCatalogueEnum.INDUSTRY],
        categories: [InnovationCategoryCatalogueEnum.MEDICAL_DEVICE, InnovationCategoryCatalogueEnum.AI],
        hasFinalProduct: randBoolean() ? YesOrNoCatalogueEnum.YES : YesOrNoCatalogueEnum.NO,
        mainCategory: InnovationCategoryCatalogueEnum.MEDICAL_DEVICE,
        mainPurpose: MainPurposeCatalogueEnum.MONITOR_CONDITION,
        moreSupportDescription: randText(),
        otherCareSetting: randText(),
        otherCategoryDescription: randText(),
        otherMainCategoryDescription: randText(),
        supportTypes: [InnovationSupportTypeCatalogueEnum.ADOPTION],
      },
      COMPARATIVE_COST_BENEFIT: {
        costComparison: randBoolean() ? CostComparisonCatalogueEnum.CHEAPER : CostComparisonCatalogueEnum.NOT_SURE,
        hasCostCareKnowledge: randBoolean() ? HasKnowledgeCatalogueEnum.DETAILED_ESTIMATE : HasKnowledgeCatalogueEnum.ROUGH_IDEA,
        hasCostSavingKnowledge: randBoolean() ? HasKnowledgeCatalogueEnum.DETAILED_ESTIMATE : HasKnowledgeCatalogueEnum.ROUGH_IDEA,
      },
      COST_OF_INNOVATION: {
        costDescription: randText(),
        hasCostKnowledge: randBoolean() ? HasKnowledgeCatalogueEnum.DETAILED_ESTIMATE : HasKnowledgeCatalogueEnum.ROUGH_IDEA,
        patientsRange: randText(),
        sellExpectations: randText(),
        usageExpectations: randText(),
      },
      CURRENT_CARE_PATHWAY: {
        carePathway: randBoolean() ? CarePathwayCatalogueEnum.BETTER_OPTION : CarePathwayCatalogueEnum.NO_KNOWLEDGE,
        hasUKPathwayKnowledge: randBoolean() ? YesNoNotRelevantCatalogueEnum.YES : YesNoNotRelevantCatalogueEnum.NO,
        innovationPathwayKnowledge: randBoolean() ? InnovationPathwayKnowledgeCatalogueEnum.PATHWAY_EXISTS_AND_FITS : InnovationPathwayKnowledgeCatalogueEnum.NO_PATHWAY,
        potentialPathway: randText(),
      },
      EVIDENCE_OF_EFFECTIVENESS: {
        evidences: [],
        hasEvidence: randBoolean() ? HasEvidenceCatalogueEnum.YES : HasEvidenceCatalogueEnum.IN_PROGRESS,
      },
      IMPLEMENTATION_PLAN: {
        deploymentPlans: [],
        files: [],
        hasDeployPlan: randBoolean() ? YesOrNoCatalogueEnum.YES : YesOrNoCatalogueEnum.NO,
        hasResourcesToScale: randBoolean() ? HasResourcesToScaleCatalogueEnum.YES : HasResourcesToScaleCatalogueEnum.NO,
        isDeployed: randBoolean() ? YesOrNoCatalogueEnum.YES : YesOrNoCatalogueEnum.NO,
      },
      INTELLECTUAL_PROPERTY: {
        hasOtherIntellectual: randBoolean() ? YesOrNoCatalogueEnum.YES : YesOrNoCatalogueEnum.NO,
        hasPatents: randBoolean() ? HasPatentsCatalogueEnum.HAS_AT_LEAST_ONE : HasPatentsCatalogueEnum.HAS_NONE,
        otherIntellectual: randText(),
      },
      MARKET_RESEARCH: {
        hasMarketResearch: randBoolean() ? HasMarketResearchCatalogueEnum.YES : HasMarketResearchCatalogueEnum.NOT_YET,
        marketResearch: randText(),
      },
      REGULATIONS_AND_STANDARDS: {
        files: [],
        hasRegulationKnowledge: randBoolean() ? HasRegulationKnowledegeCatalogueEnum.YES_ALL : HasRegulationKnowledegeCatalogueEnum.NO,
        otherRegulationDescription: randText(),
        standards: [{type: InnovationCertificationCatalogueEnum.CE_UKCA_CLASS_I, hasMet: StandardMetCatalogueEnum.IN_PROGRESS}],
      },
      REVENUE_MODEL: {
        benefittingOrganisations: randText(),
        fundingDescription: randText(),
        hasFunding: randBoolean() ? HasFundingCatalogueEnum.YES : HasFundingCatalogueEnum.NO,
        hasRevenueModel: randBoolean() ? YesOrNoCatalogueEnum.YES : YesOrNoCatalogueEnum.NO,
        otherRevenueDescription: randText(),
        payingOrganisations: randText(),
        revenues: []
      },
      TESTING_WITH_USERS: {
        hasTests: randBoolean() ? HasTestsCatalogueEnum.YES : HasTestsCatalogueEnum.NOT_YET,
        userTests: [],
        files: []
      },
      UNDERSTANDING_OF_BENEFITS: {
        accessibilityImpactDetails: randText(),
        accessibilityStepsDetails: randText(),
        environmentalBenefits: [],
        generalBenefits: [],
        hasBenefits: randBoolean() ? HasBenefitsCatalogueEnum.YES : HasBenefitsCatalogueEnum.NOT_YET,
        otherEnvironmentalBenefit: randText(),
        otherGeneralBenefit: randText(),
        otherPatientsCitizensBenefit: randText(),
        patientsCitizensBenefits: []
      },
      UNDERSTANDING_OF_NEEDS: {
        subgroups: [],
        cliniciansImpactDetails: randText(),
        diseasesConditionsImpact: [],
        impactClinicians: randBoolean(),
        impactPatients: randBoolean(),
      },
      VALUE_PROPOSITION: {
        hasProblemTackleKnowledge: randBoolean() ? HasProblemTackleKnowledgeCatalogueEnum.YES : HasProblemTackleKnowledgeCatalogueEnum.NOT_YET,
        intervention: randText(),
        interventionImpact: randText(),
        problemsConsequences: randText(),
        problemsTackled: randText(),
      }
    };

  }

  setOwner(owner: UserEntity): InnovationBuilder {
    this.innovation.owner = owner;
    return this;
  }

  setStatus(status: InnovationStatusEnum): InnovationBuilder {
    this.innovation.status = status;
    return this;
  }

  withSections(): InnovationBuilder {
    this._withSections = true;
    return this;
  }

  withSupports(organisationUnit: OrganisationUnitEntity): InnovationBuilder {
    this._withSupports = true;
    this._organisationUnit = organisationUnit;

    return this;
  }

  withSupportsAndAccessors(organisationUnit: OrganisationUnitEntity, accessors?: OrganisationUnitUserEntity[]): InnovationBuilder {
    this._withSupportsAndAccessors = true;
    this._organisationUnit = organisationUnit;
    this._organisationUnitUsers = accessors || [];

    return this;
  }

  withActions(createdBy: DomainContextType): InnovationBuilder {
    this._withActions = true;
    this._withActionCreatedBy = createdBy;
    return this;
  }

  withAssessments(assignTo: UserEntity): InnovationBuilder {
    if (!assignTo.serviceRoles.map(s => s.role).includes(ServiceRoleEnum.ASSESSMENT)) {
      throw new Error('Cannot assign an assessment to a non-assessment user');
    }
    this._assessmentUser = assignTo;
    this._withAssessments = true;
    return this;
  }

  withDocument(document: DocumentType): InnovationBuilder {
    this._document = document;
    return this;
  }

  withReassessment(): InnovationBuilder {
    if (!this._withAssessments) {
      throw new Error('Cannot create a reassessment without an assessment');
    }

    this._withReassessment = true;
    return this;
  }

  async build(entityManager: EntityManager): Promise<InnovationEntity> {

    const organisation = this._organisationUnit?.organisation;

    this.innovation.organisationShares = organisation ? [organisation] : [];

    const innovation = await entityManager.getRepository(InnovationEntity).save(this.innovation);
    const document = createDocumentFromInnovation(innovation);
    document.document = this._document || document.document;
    await entityManager.getRepository(InnovationDocumentEntity).save(document);

    let sections: InnovationSectionEntity[] | undefined;
    let support: InnovationSupportEntity | undefined;

    if (this._withSections) {
      sections = await new InnovationSectionBuilder(innovation).createAll().build(entityManager);
    }

    if (this._withSupports) {

      if (this._withSupportsAndAccessors) {
        throw new Error('Cannot set both withSupports and withSupportsAndAccessors');
      }

      support = await new InnovationSupportBuilder(innovation, this._organisationUnit)
        .setStatus(InnovationSupportStatusEnum.WAITING).build(entityManager);
    }

    if (this._withSupportsAndAccessors) {
      if (this._withSupports) {
        throw new Error('Cannot set both withSupports and withSupportsAndAccessors');
      }
      support = await new InnovationSupportBuilder(innovation, this._organisationUnit)
        .setAccessors(this._organisationUnitUsers)
        .setStatus(InnovationSupportStatusEnum.ENGAGING)
        .build(entityManager);
    }

    if (this._withActions && this._withActionCreatedBy) {

      if (!sections) {
        sections = await new InnovationSectionBuilder(innovation).createAll().build(entityManager);
      }
      const section = sections[randNumber({ min: 0, max: sections.length - 1 })];

      if (!section) {
        throw new Error('Cannot create actions without sections');
      }

      if (!support) {
        support = await new InnovationSupportBuilder(innovation, this._organisationUnit)
          .setStatus(InnovationSupportStatusEnum.WAITING).build(entityManager);
      }

      await new InnovationActionBuilder(this._withActionCreatedBy, section, support)
        .build(entityManager);
    }

    if (this._withAssessments) {
      const assessment = await new InnovationAssessmentBuilder(innovation)
        .setAssignTo(this._assessmentUser)
        .build(entityManager);

      this.innovation.assessments?.push(assessment);
    }

    if (this._withReassessment) {
      if (!innovation.assessments[0]) {
        throw new Error('Cannot create reassessment without assesment');
      }
      await new InnovationReassessmentBuilder(innovation, innovation.assessments[0])
        .build(entityManager);
    }

    const ret = await entityManager.createQueryBuilder(InnovationEntity, 'innovation')
      .innerJoinAndSelect('innovation.owner', 'owner')
      .leftJoinAndSelect('innovation.sections', 'sections')
      .leftJoinAndSelect('innovation.assessments', 'assessments')
      .leftJoinAndSelect('assessments.assignTo', 'assignedAssessors')
      .leftJoinAndSelect('assessments.organisationUnits', 'suggestedOrganisationUnits')
      .leftJoinAndSelect('innovation.innovationSupports', 'supports')
      .leftJoinAndSelect('supports.organisationUnit', 'organisationUnit')
      .leftJoinAndSelect('supports.organisationUnitUsers', 'accessors')
      .where('innovation.id = :id', { id: innovation.id })
      .getOne();

    if (!ret) {
      throw new Error('Could not find innovation');
    }

    return ret;
  }
}
