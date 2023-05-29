import { randText } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';
import type { InnovationAssessmentEntity } from '../entities/innovation/innovation-assessment.entity';
import { InnovationReassessmentRequestEntity } from '../entities/innovation/innovation-reassessment-request.entity';
import type { InnovationEntity } from '../entities/innovation/innovation.entity';

export class InnovationReassessmentBuilder {
  innovationReassessment: InnovationReassessmentRequestEntity;
  innovationAssessment: InnovationAssessmentEntity;
  innovation: InnovationEntity;

  constructor(innovation: InnovationEntity, assessment: InnovationAssessmentEntity) {
    this.innovationReassessment = InnovationReassessmentRequestEntity.new({
      innovation,
      assessment,
      updatedInnovationRecord: 'YES',
      description: randText(),
      createdBy: assessment.createdBy
    });

    this.innovation = innovation;
    this.innovationAssessment = assessment;
  }

  async build(entityManager: EntityManager): Promise<InnovationReassessmentRequestEntity> {
    const innovationReassessment = await entityManager
      .getRepository(InnovationReassessmentRequestEntity)
      .save(this.innovationReassessment);
    return innovationReassessment;
  }
}
