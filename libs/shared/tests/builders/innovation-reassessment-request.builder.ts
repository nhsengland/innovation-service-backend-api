import { randText } from '@ngneat/falso';
import type { DeepPartial, EntityManager } from 'typeorm';
import { InnovationAssessmentEntity, InnovationEntity, InnovationReassessmentRequestEntity } from '../../entities';
import { InnovationStatusEnum, type YesOrNoCatalogueType } from '../../enums';
import { BaseBuilder } from './base.builder';
import type { TestInnovationAssessmentType } from './innovation-assessment.builder';
import type { TestInnovationType } from './innovation.builder';

export type TestInnovationReassessmentType = {
  id: string;
  description: string;
  updatedInnovationRecord: YesOrNoCatalogueType;
};

export class InnovationReassessmentRequestBuilder extends BaseBuilder {
  private request: DeepPartial<InnovationReassessmentRequestEntity> = {
    description: randText(),
    updatedInnovationRecord: 'YES'
  };

  constructor(entityManager: EntityManager) {
    super(entityManager);
  }

  setAssessment(assessment: TestInnovationAssessmentType): this {
    this.request.assessment = { id: assessment.id };
    return this;
  }

  setInnovation(innovation: Pick<TestInnovationType, 'id'>): this {
    this.request.innovation = { id: innovation.id };
    return this;
  }

  async save(): Promise<TestInnovationReassessmentType> {
    // Assertions
    if (!this.request.assessment) {
      throw new Error('Reassessment requires an original assessment');
    }
    if (!this.request.innovation) {
      throw new Error('Reassessment requires an innovation');
    }

    const newRequest = await this.getEntityManager()
      .getRepository(InnovationReassessmentRequestEntity)
      .save(this.request);

    // Update related entity status as failsafe
    await this.getEntityManager().update(
      InnovationEntity,
      { id: this.request.innovation.id },
      { status: InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT }
    );

    await this.getEntityManager().update(
      InnovationAssessmentEntity,
      { id: this.request.assessment.id },
      { finishedAt: null }
    );

    const result = await this.getEntityManager()
      .createQueryBuilder(InnovationReassessmentRequestEntity, 'request')
      .where('request.id = :id', { id: newRequest.id })
      .getOne();

    if (!result) {
      throw new Error('Error saving/retrieving innovation reassessment information.');
    }

    return {
      id: result.id,
      description: result.description,
      updatedInnovationRecord: result.updatedInnovationRecord
    };
  }
}
