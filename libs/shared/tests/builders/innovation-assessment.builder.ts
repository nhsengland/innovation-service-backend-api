import { InnovationAssessmentEntity } from '../../entities/innovation/innovation-assessment.entity';
import type { MaturityLevelCatalogueType, YesPartiallyNoCatalogueType } from '../../enums/index';
import type { DeepPartial, EntityManager } from 'typeorm';
import { BaseBuilder } from './base.builder';

export type TestInnovationAssessmentType = {
  id: string;
  description: string | null;
  summary: string | null;
  maturityLevel: MaturityLevelCatalogueType | null;
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

  private assessment: DeepPartial<InnovationAssessmentEntity> = {};

  constructor(entityManager: EntityManager){
    super(entityManager);
  }

  setInnovation(innovationId: string): this {
    this.assessment.innovation = { id: innovationId };
    return this;
  }

  setNeedsAssessor(userId: string): this {
    this.assessment.assignTo = { id: userId };
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

    if (!result) {
      throw new Error('Error saving/retriving assessment information.');
    }

    return {
      id: result.id,
      description: result.description,
      summary: result.summary,
      maturityLevel: result.maturityLevel,
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
