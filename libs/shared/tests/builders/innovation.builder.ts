import { randBoolean, randCountry, randProduct, randText } from '@ngneat/falso';
import type { DeepPartial, EntityManager } from 'typeorm';

import { InnovationDocumentDraftEntity } from '../../entities/innovation/innovation-document-draft.entity';
import { InnovationDocumentEntity } from '../../entities/innovation/innovation-document.entity';
import { InnovationEntity } from '../../entities/innovation/innovation.entity';
import { InnovationSectionStatusEnum, InnovationStatusEnum } from '../../enums/innovation.enums';
import { NotFoundError } from '../../errors/errors.config';
import { UserErrorsEnum } from '../../errors/errors.enums';

import type { CurrentCatalogTypes, CurrentDocumentType } from '../../schemas/innovation-record';
import { BaseBuilder } from './base.builder';
import type { TestOrganisationType } from './organisation.builder';

export type TestInnovationType = {
  id: string;
  name: string;
  status: InnovationStatusEnum;
  ownerId: string;
  sections: Map<
    CurrentCatalogTypes.InnovationSections,
    {
      id: string;
      status: InnovationSectionStatusEnum;
      section: CurrentCatalogTypes.InnovationSections;
      updatedAt: Date;
    }
  >;
  evidences: CurrentDocumentType['evidences'];
  sharedOrganisations: { id: string; name: string }[];
};

export class InnovationBuilder extends BaseBuilder {
  private static counter = 0;
  private innovation: DeepPartial<InnovationEntity> = {
    name: randProduct().title,
    uniqueId: `INN-1111-${InnovationBuilder.counter++}-1`, // We're not using this for anything in tests using 1111 so that it's easier to manipulate in the tests
    status: InnovationStatusEnum.CREATED,
    owner: null,
    assessments: [],
    organisationShares: [],
    sections: [],
    transfers: []
  };

  private document: CurrentDocumentType = {
    version: 202304,
    INNOVATION_DESCRIPTION: {
      name: this.innovation.name!,
      description: randProduct().description,
      countryName: randCountry(),
      postcode: undefined,

      areas: randBoolean() ? ['COVID_19'] : ['OPERATIONAL_EXCELLENCE'],
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
      hasEvidence: 'YES',
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
      standards: [
        { type: 'CE_UKCA_CLASS_I', hasMet: 'IN_PROGRESS' },
        { type: 'IVD_GENERAL', hasMet: 'IN_PROGRESS' }
      ]
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

  constructor(entityManager: EntityManager) {
    super(entityManager);
  }

  setOwner(userId: string): this {
    this.innovation.owner = { id: userId };
    return this;
  }

  setStatus(status: InnovationStatusEnum): this {
    this.innovation.status = status;
    this.innovation.hasBeenAssessed =
      status !== InnovationStatusEnum.CREATED && status !== InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT;
    this.innovation.submittedAt = status !== InnovationStatusEnum.CREATED ? new Date() : null;
    return this;
  }

  setName(name: string): this {
    this.innovation.name = name;
    this.document.INNOVATION_DESCRIPTION.name = name;
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

  withDocument(document: CurrentDocumentType): this {
    this.document = document;
    return this;
  }

  withEvidences(evidences: CurrentDocumentType['evidences']): this {
    this.document.evidences = evidences;
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
    await this.getEntityManager()
      .getRepository(InnovationDocumentDraftEntity)
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
      throw new Error('InnovationBuilder::save: Error saving/retriving innovation information.');
    }

    // Sanity check but this requirement might actually change in the future. Builder forces owner for now
    if (!result.owner) {
      throw new NotFoundError(UserErrorsEnum.USER_SQL_NOT_FOUND);
    }

    return {
      id: result.id,
      name: result.name,
      status: result.status,
      ownerId: result.owner.id,
      sections: new Map(result.sections.map(s => [s['section'], { ...s, updatedAt: s.updatedAt }])),
      sharedOrganisations: result.organisationShares.map(s => ({ id: s.id, name: s.name })),
      evidences: this.document.evidences
    };
  }
}
