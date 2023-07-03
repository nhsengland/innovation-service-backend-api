import { randBoolean, randCountry, randProduct, randText } from '@ngneat/falso';
import type { DeepPartial, EntityManager } from 'typeorm';

import { InnovationDocumentEntity } from '../../entities/innovation/innovation-document.entity';
import { InnovationEntity } from '../../entities/innovation/innovation.entity';
import { InnovationSectionStatusEnum, InnovationStatusEnum } from '../../enums/innovation.enums';
import { NotFoundError } from '../../errors/errors.config';
import { UserErrorsEnum } from '../../errors/errors.enums';

import type { CurrentCatalogTypes, DocumentType } from '../../schemas/innovation-record';
import { BaseBuilder } from './base.builder';
import type { TestOrganisationType } from './organisation.builder';

export type TestInnovationType = {
  id: string;
  name: string;
  ownerId: string;
  sections: Map<
    CurrentCatalogTypes.InnovationSections,
    { id: string; status: InnovationSectionStatusEnum; section: CurrentCatalogTypes.InnovationSections }
  >;
  sharedOrganisations: { id: string; name: string }[];
};

export class InnovationBuilder extends BaseBuilder {
  private innovation: DeepPartial<InnovationEntity> = {
    name: randProduct().title,
    description: randProduct().description,
    countryName: randCountry(),
    status: InnovationStatusEnum.CREATED,
    owner: null,
    assessments: [],
    organisationShares: [],
    sections: [],
    transfers: []
  };

  private document: DocumentType = {
    version: '202304',
    INNOVATION_DESCRIPTION: {
      name: this.innovation.name!,
      description: this.innovation.description!,
      countryName: this.innovation.countryName,
      postcode: this.innovation.postcode ?? undefined,

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
      files: [],
      howInnovationWork: randText(),
      impactDiseaseCondition: randBoolean() ? 'YES' : 'NO',
      keyHealthInequalities: ['NONE'],
      problemsTackled: randBoolean() ? 'YES' : 'NO'
    },
    EVIDENCE_OF_EFFECTIVENESS: {
      hasEvidence: randBoolean() ? 'YES' : 'NOT_YET',
      currentlyCollectingEvidence: randBoolean() ? 'YES' : 'NO',
      files: [],
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
      userTests: [],
      files: []
    },
    REGULATIONS_AND_STANDARDS: {
      files: [],
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
      files: [],
      hasDeployPlan: randBoolean() ? 'YES' : 'NO',
      hasResourcesToScale: randBoolean() ? 'YES' : 'NO',
      isDeployed: randBoolean() ? 'YES' : 'NO'
    },
    evidences: []
  };

  constructor(entityManager: EntityManager) {
    super(entityManager);
  }

  setOwner(userId: string): this {
    this.innovation.owner = { id: userId };
    return this;
  }

  setStatus(status: InnovationStatusEnum): this {
    this.innovation.status = status;
    return this;
  }

  addSection(section: CurrentCatalogTypes.InnovationSections, status?: InnovationSectionStatusEnum): this {
    this.innovation.sections = [
      ...(this.innovation.sections ?? []),
      { section: section, status: status ?? InnovationSectionStatusEnum.SUBMITTED }
    ];
    return this;
  }

  shareWith(organisations: TestOrganisationType[]): this {
    this.innovation.organisationShares = organisations.map(org => ({ id: org.id }));
    return this;
  }

  withDocument(document: DocumentType): this {
    this.document = document;
    return this;
  }

  async save(): Promise<TestInnovationType> {
    const savedInnovation = await this.getEntityManager()
      .getRepository(InnovationEntity)
      .save({
        ...this.innovation,
        sections: this.innovation.sections
      });

    await this.getEntityManager()
      .getRepository(InnovationDocumentEntity)
      .save({
        innovation: { id: savedInnovation.id },
        version: this.document.version,
        document: this.document
      });

    const result = await this.getEntityManager()
      .createQueryBuilder(InnovationEntity, 'innovation')
      .leftJoinAndSelect('innovation.owner', 'owner')
      .leftJoinAndSelect('innovation.sections', 'sections')
      .leftJoinAndSelect('innovation.transfers', 'transfers')
      .leftJoinAndSelect('innovation.collaborators', 'collaborators')
      .leftJoinAndSelect('innovation.organisationShares', 'organisationShares')
      .where('innovation.id = :id', { id: savedInnovation.id })
      .getOne();

    if (!result) {
      throw new Error('Error saving/retriving innovation information.');
    }

    // Sanity check but this requirement might actually change in the future. Builder forces owner for now
    if (!result.owner) {
      throw new NotFoundError(UserErrorsEnum.USER_SQL_NOT_FOUND);
    }

    return {
      id: result.id,
      name: result.name,
      ownerId: result.owner.id,
      sections: new Map(result.sections.map(s => [s['section'], s])),
      sharedOrganisations: result.organisationShares.map(s => ({ id: s.id, name: s.name }))
    };
  }
}
