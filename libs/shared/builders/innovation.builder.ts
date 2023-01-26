import { randBoolean, randCountry, randNumber, randProduct, randText, randUuid, randZipCode } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';
import { InnovationEntity, type InnovationSectionEntity, type InnovationSupportEntity, type OrganisationUnitEntity, type OrganisationUnitUserEntity, type UserEntity } from '../entities';
import { CostComparisonCatalogueEnum, HasBenefitsCatalogueEnum, HasEvidenceCatalogueEnum, HasFundingCatalogueEnum, HasKnowledgeCatalogueEnum, HasMarketResearchCatalogueEnum, HasPatentsCatalogueEnum, HasProblemTackleKnowledgeCatalogueEnum, HasRegulationKnowledegeCatalogueEnum, HasResourcesToScaleCatalogueEnum, HasTestsCatalogueEnum, InnovationCategoryCatalogueEnum, InnovationPathwayKnowledgeCatalogueEnum, InnovationStatusEnum, InnovationSupportStatusEnum, MainPurposeCatalogueEnum, UserTypeEnum, YesNoNotRelevantCatalogueEnum, YesOrNoCatalogueEnum } from '../enums';
import { InnovationActionBuilder } from './innovation-action.builder';
import { InnovationAssessmentBuilder } from './innovation-assessment.builder';
import { InnovationSectionBuilder } from './innovation-section.builder';
import { InnovationSupportBuilder } from './innovation-support.builder';


export class InnovationBuilder {

  innovation: Partial<InnovationEntity> = {};

  private _withSections = false;
  private _withSupports = false;
  private _withSupportsAndAccessors = false;
  private _withActions = false;
  private _withAssessments = false;

  private _organisationUnit: OrganisationUnitEntity;
  private _organisationUnitUsers: OrganisationUnitUserEntity[];
  private _assessmentUser: UserEntity;

  constructor() {
    this.innovation = {
      name: randProduct().title,
      description: randText(),
      accessibilityImpactDetails: randText(),
      accessibilityStepsDetails: randText(),
      benefittingOrganisations: randText(),
      carePathway: randText(),
      cliniciansImpactDetails: randText(),
      costComparison: randBoolean() ? CostComparisonCatalogueEnum.CHEAPER : CostComparisonCatalogueEnum.NOT_SURE,
      costDescription: randText(),
      countryName: randCountry(),
      createdAt: new Date().toISOString(),
      fundingDescription: randText(),
      hasBenefits: randBoolean() ? HasBenefitsCatalogueEnum.YES : HasBenefitsCatalogueEnum.NOT_YET,
      hasCostCareKnowledge: randBoolean() ? HasKnowledgeCatalogueEnum.DETAILED_ESTIMATE : HasKnowledgeCatalogueEnum.ROUGH_IDEA,
      hasCostKnowledge: randBoolean() ? HasKnowledgeCatalogueEnum.DETAILED_ESTIMATE : HasKnowledgeCatalogueEnum.ROUGH_IDEA,
      hasFunding: randBoolean() ? HasFundingCatalogueEnum.YES : HasFundingCatalogueEnum.NO,
      hasCostSavingKnowledge: randBoolean() ? HasKnowledgeCatalogueEnum.DETAILED_ESTIMATE : HasKnowledgeCatalogueEnum.ROUGH_IDEA,
      hasDeployPlan: randBoolean() ? YesOrNoCatalogueEnum.YES : YesOrNoCatalogueEnum.NO,
      hasEvidence: randBoolean() ? HasEvidenceCatalogueEnum.YES : HasEvidenceCatalogueEnum.IN_PROGRESS,
      hasFinalProduct: randBoolean() ? YesOrNoCatalogueEnum.YES : YesOrNoCatalogueEnum.NO,
      hasMarketResearch: randBoolean() ? HasMarketResearchCatalogueEnum.YES : HasMarketResearchCatalogueEnum.NOT_YET,
      hasOtherIntellectual: randBoolean() ? YesOrNoCatalogueEnum.YES : YesOrNoCatalogueEnum.NO,
      hasPatents: randBoolean() ? HasPatentsCatalogueEnum.HAS_AT_LEAST_ONE : HasPatentsCatalogueEnum.HAS_NONE,
      hasProblemTackleKnowledge: randBoolean() ? HasProblemTackleKnowledgeCatalogueEnum.YES : HasProblemTackleKnowledgeCatalogueEnum.NOT_YET,
      hasRegulationKnowledge: randBoolean() ? HasRegulationKnowledegeCatalogueEnum.YES_ALL : HasRegulationKnowledegeCatalogueEnum.NO,
      hasResourcesToScale: randBoolean() ? HasResourcesToScaleCatalogueEnum.YES : HasResourcesToScaleCatalogueEnum.NO,
      hasRevenueModel: randBoolean() ? YesOrNoCatalogueEnum.YES : YesOrNoCatalogueEnum.NO,
      hasTests: randBoolean() ? HasTestsCatalogueEnum.YES : HasTestsCatalogueEnum.NOT_YET,
      hasUKPathwayKnowledge: randBoolean() ? YesNoNotRelevantCatalogueEnum.YES : YesNoNotRelevantCatalogueEnum.NO,
      usageExpectations: randText(),
      otherCareSetting: randText(),
      otherCategoryDescription: randText(),
      otherEnvironmentalBenefit: randText(),
      otherGeneralBenefit: randText(),
      otherIntellectual: randText(),
      otherMainCategoryDescription: randText(),
      otherPatientsCitizensBenefit: randText(),
      otherRegulationDescription: randText(),
      otherRevenueDescription: randText(),

      impactClinicians: randBoolean(),
      impactPatients: randBoolean(),

      mainCategory: InnovationCategoryCatalogueEnum.MEDICAL_DEVICE,
      innovationPathwayKnowledge: randBoolean() ? InnovationPathwayKnowledgeCatalogueEnum.PATHWAY_EXISTS_AND_FITS : InnovationPathwayKnowledgeCatalogueEnum.NO_PATHWAY,
      intervention: randText(),
      isDeployed: randBoolean() ? YesOrNoCatalogueEnum.YES : YesOrNoCatalogueEnum.NO,
      interventionImpact: randText(),
      mainPurpose: MainPurposeCatalogueEnum.MONITOR_CONDITION,
      marketResearch: randText(),
      patientsRange: randText(),
      moreSupportDescription: randText(),
      payingOrganisations: randText(),
      postcode: randZipCode(),
      potentialPathway: randText(),
      problemsConsequences: randText(),
      problemsTackled: randText(),
      sellExpectations: randText(),
      surveyId: randUuid(),
      status: InnovationStatusEnum.IN_PROGRESS
    };

  }

  setOwner(owner: UserEntity): InnovationBuilder {
    this.innovation.owner = owner;
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

  withActions(): InnovationBuilder {
    this._withActions = true;
    return this;
  }

  withAssessments(assignTo: UserEntity): InnovationBuilder {
    if (assignTo.type !== UserTypeEnum.ASSESSMENT) {
      throw new Error('Cannot assign an assessment to a non-assessment user');
    }
    this._assessmentUser = assignTo;
    this._withAssessments = true;
    return this;
  }


  async build(entityManager: EntityManager): Promise<InnovationEntity> {

    const organisation = this._organisationUnit?.organisation;

    this.innovation.organisationShares = organisation ? [organisation] : [];

    const innovation = await entityManager.getRepository(InnovationEntity).save(this.innovation);

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

    if (this._withActions) {

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

      await new InnovationActionBuilder(section, support).build(entityManager);
    }

    if (this._withAssessments) {
      await new InnovationAssessmentBuilder(innovation)
        .setAssignTo(this._assessmentUser).build(entityManager);
    }

    const ret = await entityManager.createQueryBuilder(InnovationEntity, 'innovation')
      .innerJoinAndSelect('innovation.owner', 'owner')
      .leftJoinAndSelect('innovation.sections', 'sections')
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