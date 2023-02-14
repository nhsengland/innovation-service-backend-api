import { InnovationAssessmentEntity, InnovationReassessmentRequestEntity, type InnovationEntity } from '../entities';
import { YesOrNoCatalogueEnum } from '../enums';
import { randText } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';

export class InnovationReassessmentBuilder {

  innovationReassessment: InnovationReassessmentRequestEntity;
  innovationAssessment: InnovationAssessmentEntity;
  innovation: InnovationEntity;
  
 
  constructor(innovation: InnovationEntity, assessment: InnovationAssessmentEntity) {
    this.innovationReassessment = InnovationReassessmentRequestEntity.new({
      innovation,
      assessment,
      updatedInnovationRecord: YesOrNoCatalogueEnum.YES,
      description: randText(),
      createdBy: assessment.createdBy
      });

    this.innovation = innovation;
    this.innovationAssessment = assessment;
  }


  async build(entityManager: EntityManager): Promise<InnovationReassessmentRequestEntity> {

    const innovationReassessment = await entityManager.getRepository(InnovationReassessmentRequestEntity).save(this.innovationReassessment);
    return innovationReassessment;
  }

}