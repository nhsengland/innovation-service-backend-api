import { randBoolean, randCountry, randNumber, randProduct, randText, randUuid, randZipCode } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';
import { InnovationEntity, type InnovationSectionEntity, type InnovationSupportEntity, type OrganisationUnitEntity, type OrganisationUnitUserEntity, type UserEntity } from '../entities';
import { InnovationDocumentEntity, createDocumentFromInnovation } from '../entities/innovation/innovation-document.entity';
import { InnovationStatusEnum, InnovationSupportStatusEnum, ServiceRoleEnum } from '../enums';
import type { DocumentType } from '../schemas/innovation-record';
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
      version: '202304',
      INNOVATION_DESCRIPTION: {
        name: this.innovation.name!,
        description: this.innovation.description!,
        countryName: this.innovation.countryName,
        postcode: this.innovation.postcode!,
        
        areas: ['COVID_19'],
        careSettings: ['INDUSTRY'],
        categories: ['MEDICAL_DEVICE', 'AI'],
        hasFinalProduct: randBoolean() ? 'YES' : 'NO',
        mainCategory: 'MEDICAL_DEVICE',
        mainPurpose: 'MONITOR_CONDITION',
        otherCareSetting: randText(),
        otherCategoryDescription: randText(),
        otherMainCategoryDescription: randText(),
      },
      EVIDENCE_OF_EFFECTIVENESS: {
        evidences: [],
        hasEvidence: randBoolean() ? 'YES' : 'IN_PROGRESS',
      },
      MARKET_RESEARCH: {
        hasMarketResearch: randBoolean() ? 'YES' : 'NOT_YET',
        marketResearch: randText(),
      },
      CURRENT_CARE_PATHWAY: {
        innovationPathwayKnowledge: randBoolean() ? 'PATHWAY_EXISTS_AND_FITS' : 'NO_PATHWAY',
        potentialPathway: randText(),
      },
      TESTING_WITH_USERS: {
        userTests: [],
        files: []
      },
      REGULATIONS_AND_STANDARDS: {
        files: [],
        hasRegulationKnowledge: randBoolean() ? 'YES_ALL' : 'NO',
        otherRegulationDescription: randText(),
        standards: [{type: 'CE_UKCA_CLASS_I', hasMet: 'IN_PROGRESS'}],
      },
      INTELLECTUAL_PROPERTY: {
        hasOtherIntellectual: randBoolean() ? 'YES' : 'NO',
        hasPatents: randBoolean() ? 'HAS_AT_LEAST_ONE' : 'HAS_NONE',
        otherIntellectual: randText(),
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
        usageExpectations: randText(),
      },
      DEPLOYMENT: {
        deploymentPlans: [],
        files: [],
        hasDeployPlan: randBoolean() ? 'YES' : 'NO',
        hasResourcesToScale: randBoolean() ? 'YES' : 'NO',
        isDeployed: randBoolean() ? 'YES' : 'NO',
      },
      /*
      UNDERSTANDING_OF_BENEFITS: {
        accessibilityImpactDetails: randText(),
        accessibilityStepsDetails: randText(),
        environmentalBenefits: [],
        generalBenefits: [],
        hasBenefits: randBoolean() ? 'YES' : 'NOT_YET',
        otherEnvironmentalBenefit: randText(),
        otherGeneralBenefit: randText(),
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
        hasProblemTackleKnowledge: randBoolean() ? 'YES' : 'NOT_YET',
        intervention: randText(),
        interventionImpact: randText(),
        problemsConsequences: randText(),
        problemsTackled: randText(),
      }
      */
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
