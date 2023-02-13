import { InnovationAssessmentEntity, type InnovationEntity, type UserEntity } from '../entities';
import { YesPartiallyNoCatalogueEnum, MaturityLevelCatalogueEnum } from '../enums';
import { randPastDate, randText, randBoolean } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';

export class InnovationAssessmentBuilder {

  innovationAssessment: Partial<InnovationAssessmentEntity> = { };
  innovation: InnovationEntity;
 
  constructor(innovation: InnovationEntity) {
    this.innovationAssessment = InnovationAssessmentEntity.new({
      innovation,
      description: randText(),
      hasCompetitionKnowledge: randBoolean() ? YesPartiallyNoCatalogueEnum.YES : YesPartiallyNoCatalogueEnum.NO,
      hasCompetitionKnowledgeComment: randText(),
      hasEvidence: randBoolean() ? YesPartiallyNoCatalogueEnum.YES : YesPartiallyNoCatalogueEnum.NO,
      hasEvidenceComment: randText(),
      hasImplementationPlan: randBoolean() ? YesPartiallyNoCatalogueEnum.YES : YesPartiallyNoCatalogueEnum.NO,
      hasImplementationPlanComment: randText(),
      hasProposition: randBoolean() ? YesPartiallyNoCatalogueEnum.YES : YesPartiallyNoCatalogueEnum.NO,
      hasPropositionComment: randText(),
      hasRegulatoryApprovals: randBoolean() ? YesPartiallyNoCatalogueEnum.YES : YesPartiallyNoCatalogueEnum.NO,
      hasRegulatoryApprovalsComment: randText(),
      hasScaleResource: randBoolean() ? YesPartiallyNoCatalogueEnum.YES : YesPartiallyNoCatalogueEnum.NO,
      hasScaleResourceComment: randText(),
      hasValidation: randBoolean() ? YesPartiallyNoCatalogueEnum.YES : YesPartiallyNoCatalogueEnum.NO,
      hasValidationComment: randText(),
      maturityLevel: MaturityLevelCatalogueEnum.READY,
      maturityLevelComment: randText(),
      summary: randText(),
      updatedAt: randPastDate().toISOString()
    });

    this.innovation = innovation;
  }

  setAssignTo(user: UserEntity): InnovationAssessmentBuilder {
    this.innovationAssessment.assignTo = user;
    this.innovationAssessment.createdBy = user.id;
    this.innovationAssessment.updatedBy = user.id;
    return this;
  }

  isFinished(): InnovationAssessmentBuilder {
    this.innovationAssessment.finishedAt = randPastDate().toISOString();
    return this;
  }

  async build(entityManager: EntityManager): Promise<InnovationAssessmentEntity> {

    if (!this.innovationAssessment.assignTo) {
      throw new Error('Assessment must be assigned to a user');
    }

    const innovationAssessment = await entityManager.getRepository(InnovationAssessmentEntity).save(this.innovationAssessment);

    return innovationAssessment;
  }

}