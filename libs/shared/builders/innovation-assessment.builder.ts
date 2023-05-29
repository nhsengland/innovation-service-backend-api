import { randBoolean, randPastDate, randText } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';
import { InnovationAssessmentEntity } from '../entities/innovation/innovation-assessment.entity';
import type { InnovationEntity } from '../entities/innovation/innovation.entity';
import type { UserEntity } from '../entities/user/user.entity';

export class InnovationAssessmentBuilder {
  innovationAssessment: Partial<InnovationAssessmentEntity> = {};
  innovation: InnovationEntity;

  constructor(innovation: InnovationEntity) {
    this.innovationAssessment = InnovationAssessmentEntity.new({
      innovation,
      description: randText(),
      hasCompetitionKnowledge: randBoolean() ? 'YES' : 'NO',
      hasCompetitionKnowledgeComment: randText(),
      hasEvidence: randBoolean() ? 'YES' : 'NO',
      hasEvidenceComment: randText(),
      hasImplementationPlan: randBoolean() ? 'YES' : 'NO',
      hasImplementationPlanComment: randText(),
      hasProposition: randBoolean() ? 'YES' : 'NO',
      hasPropositionComment: randText(),
      hasRegulatoryApprovals: randBoolean() ? 'YES' : 'NO',
      hasRegulatoryApprovalsComment: randText(),
      hasScaleResource: randBoolean() ? 'YES' : 'NO',
      hasScaleResourceComment: randText(),
      hasValidation: randBoolean() ? 'YES' : 'NO',
      hasValidationComment: randText(),
      maturityLevel: 'READY',
      maturityLevelComment: randText(),
      summary: randText(),
      updatedAt: randPastDate()
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
    this.innovationAssessment.finishedAt = randPastDate();
    return this;
  }

  async build(entityManager: EntityManager): Promise<InnovationAssessmentEntity> {
    if (!this.innovationAssessment.assignTo) {
      throw new Error('Assessment must be assigned to a user');
    }

    const innovationAssessment = await entityManager
      .getRepository(InnovationAssessmentEntity)
      .save(this.innovationAssessment);

    return innovationAssessment;
  }
}
