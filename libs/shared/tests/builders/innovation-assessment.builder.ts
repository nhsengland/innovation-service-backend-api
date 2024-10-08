import { randProductDescription, randText } from '@ngneat/falso';
import type { DeepPartial, EntityManager } from 'typeorm';
import { InnovationAssessmentEntity, InnovationEntity } from '../../entities';
import type { MaturityLevelCatalogueType, YesPartiallyNoCatalogueType } from '../../enums/index';
import { BaseBuilder } from './base.builder';
import type { TestOrganisationUnitType } from './organisation-unit.builder';

export type TestInnovationAssessmentType = {
  id: string;
  majorVersion: number;
  minorVersion: number;
  editReason: string | null;
  description: string | null;
  summary: string | null;
  maturityLevel: MaturityLevelCatalogueType | null;
  maturityLevelComment: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  hasRegulatoryApprovals: YesPartiallyNoCatalogueType | null;
  hasRegulatoryApprovalsComment: string | null;
  hasEvidence: YesPartiallyNoCatalogueType | null;
  hasEvidenceComment: string | null;
  hasValidation: YesPartiallyNoCatalogueType | null;
  hasValidationComment: string | null;
  hasProposition: YesPartiallyNoCatalogueType | null;
  hasPropositionComment: string | null;
  hasCompetitionKnowledge: YesPartiallyNoCatalogueType | null;
  hasCompetitionKnowledgeComment: string | null;
  hasImplementationPlan: YesPartiallyNoCatalogueType | null;
  hasImplementationPlanComment: string | null;
  hasScaleResource: YesPartiallyNoCatalogueType | null;
  hasScaleResourceComment: string | null;
};

export class InnovationAssessmentBuilder extends BaseBuilder {
  private assessment: DeepPartial<InnovationAssessmentEntity> = {
    majorVersion: 1,
    minorVersion: 0,
    description: randProductDescription(),
    startedAt: new Date(),
    summary: randText(),
    maturityLevel: 'READY',
    maturityLevelComment: randText(),
    finishedAt: null,
    hasRegulatoryApprovals: 'YES',
    hasRegulatoryApprovalsComment: randText(),
    hasEvidence: 'YES',
    hasEvidenceComment: randText(),
    hasValidation: 'YES',
    hasValidationComment: randText(),
    hasProposition: 'YES',
    hasPropositionComment: randText(),
    hasCompetitionKnowledge: 'YES',
    hasCompetitionKnowledgeComment: randText(),
    hasImplementationPlan: 'YES',
    hasImplementationPlanComment: randText(),
    hasScaleResource: 'YES',
    hasScaleResourceComment: randText(),
    organisationUnits: []
  };

  constructor(entityManager: EntityManager) {
    super(entityManager);
  }

  setInnovation(innovationId: string): this {
    this.assessment.innovation = { id: innovationId };
    return this;
  }

  setVersion(major: number, minor: number): this {
    this.assessment.majorVersion = major;
    this.assessment.minorVersion = minor;
    return this;
  }

  setPreviousAssessment(assessmentId: string): this {
    this.assessment.previousAssessment = { id: assessmentId };
    return this;
  }

  setNeedsAssessor(userId: string): this {
    this.assessment.assignTo = { id: userId };
    return this;
  }

  setUpdatedBy(userId: string): this {
    this.assessment.updatedBy = userId;
    return this;
  }

  setFinishedAt(date?: Date): this {
    this.assessment.finishedAt = date || new Date();
    return this;
  }

  suggestOrganisationUnits(...organisationUnits: TestOrganisationUnitType[]): this {
    this.assessment.organisationUnits = [
      ...(this.assessment.organisationUnits ?? []),
      ...organisationUnits.map(unit => ({ id: unit.id }))
    ];
    return this;
  }

  async save(): Promise<TestInnovationAssessmentType> {
    const savedAssessment = await this.getEntityManager()
      .getRepository(InnovationAssessmentEntity)
      .save(this.assessment);

    const result = await this.getEntityManager()
      .createQueryBuilder(InnovationAssessmentEntity, 'assessment')
      .where('assessment.id = :id', { id: savedAssessment.id })
      .getOne();

    await this.getEntityManager().update(
      InnovationEntity,
      { id: this.assessment.innovation?.id },
      {
        currentAssessment: { id: savedAssessment.id },
        ...(this.assessment.minorVersion === 0 && { currentMajorAssessment: { id: savedAssessment.id } }),
        hasBeenAssessed: !!this.assessment.finishedAt
      }
    );

    if (!result) {
      throw new Error('Error saving/retriving assessment information.');
    }

    return {
      id: result.id,
      majorVersion: result.majorVersion,
      minorVersion: result.minorVersion,
      editReason: result.editReason,
      description: result.description,
      summary: result.summary,
      maturityLevel: result.maturityLevel,
      maturityLevelComment: result.maturityLevelComment,
      startedAt: result.startedAt,
      finishedAt: result.finishedAt,
      hasRegulatoryApprovals: result.hasRegulatoryApprovals,
      hasRegulatoryApprovalsComment: result.hasRegulatoryApprovalsComment,
      hasEvidence: result.hasEvidence,
      hasEvidenceComment: result.hasEvidenceComment,
      hasValidation: result.hasValidation,
      hasValidationComment: result.hasValidationComment,
      hasProposition: result.hasProposition,
      hasPropositionComment: result.hasPropositionComment,
      hasCompetitionKnowledge: result.hasCompetitionKnowledge,
      hasCompetitionKnowledgeComment: result.hasCompetitionKnowledgeComment,
      hasImplementationPlan: result.hasImplementationPlan,
      hasImplementationPlanComment: result.hasImplementationPlanComment,
      hasScaleResource: result.hasScaleResource,
      hasScaleResourceComment: result.hasScaleResourceComment
    };
  }
}
