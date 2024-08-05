import { randText } from '@ngneat/falso';
import type { DeepPartial, EntityManager } from 'typeorm';
import { InnovationAssessmentEntity, InnovationEntity, InnovationReassessmentRequestEntity } from '../../entities';
import { InnovationStatusEnum } from '../../enums';
import { BaseBuilder } from './base.builder';
import type { TestInnovationAssessmentType } from './innovation-assessment.builder';
import type { TestInnovationType } from './innovation.builder';
import type { ReassessmentType } from 'apps/innovations/_types/innovation.types';

export type TestInnovationReassessmentType = {
  id: string;
  reassessment: ReassessmentType;
};

export class InnovationReassessmentRequestBuilder extends BaseBuilder {
  updateStatus = true;

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

  setUpdateStatus(updateStatus: boolean): this {
    this.updateStatus = updateStatus;
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
    if (this.updateStatus) {
      await this.getEntityManager().update(
        InnovationEntity,
        { id: this.request.innovation.id },
        { status: InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT }
      );
    }

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
      reassessment: {
        description: result.description,
        reassessmentReason: result.reassessmentReason,
        whatSupportDoYouNeed: result.whatSupportDoYouNeed
      }
    };
  }
}
