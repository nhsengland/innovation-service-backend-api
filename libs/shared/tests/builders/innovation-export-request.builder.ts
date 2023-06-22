import type { DeepPartial, EntityManager } from 'typeorm';
import { BaseBuilder } from './base.builder';
import { InnovationExportRequestStatusEnum } from '../../enums/innovation.enums';
import { InnovationExportRequestEntity } from '../../entities/innovation/innovation-export-request.entity';
import { randText } from '@ngneat/falso';

export type TestInnovationExportRequestType = {
  id: string;
  status: InnovationExportRequestStatusEnum;
  requestReason: string;
  rejectReason: string | null;
  createdBy: {
    id: string;
    unitId: string;
    unitName: string;
  };
};

export class InnovationExportRequestBuilder extends BaseBuilder {
  private request: DeepPartial<InnovationExportRequestEntity> = {
    status: InnovationExportRequestStatusEnum.PENDING,
    requestReason: randText({ charCount: 10 }),
    rejectReason: randText({ charCount: 10 })
  };

  constructor(entityManager: EntityManager) {
    super(entityManager);
  }

  setInnovation(innovationId: string): this {
    this.request.innovation = { id: innovationId };
    return this;
  }

  setStatus(status: InnovationExportRequestStatusEnum): this {
    this.request.status = status;
    return this;
  }

  setCreatedBy(userId: string, organisationUnitId: string): this {
    this.request.createdBy = userId;
    this.request.updatedBy = userId;
    this.request.organisationUnit = { id: organisationUnitId };
    return this;
  }

  async save(): Promise<TestInnovationExportRequestType> {

    if (!this.request.createdBy) {
      throw new Error(`innovationExportBuilder::save:: can't save export request without createdBy`)
    }

    if (!this.request.organisationUnit) {
      throw new Error(`innovationExportBuilder::save:: can't save export request without organisation unit`)
    }

    const savedRequest = await this.getEntityManager().getRepository(InnovationExportRequestEntity).save(this.request);

    const result = await this.getEntityManager()
      .createQueryBuilder(InnovationExportRequestEntity, 'request')
      .innerJoinAndSelect('request.organisationUnit', 'unit')
      .where('request.id = :id', { id: savedRequest.id })
      .getOne();

    if (!result) {
      throw new Error('Error saving/retriving innovation export request information.');
    }

    return {
      id: result.id,
      status: result.status,
      requestReason: result.requestReason,
      rejectReason: result.rejectReason,
      createdBy: {
        id: result.createdBy,
        unitId: result.organisationUnit.id,
        unitName: result.organisationUnit.name
      }
    };
  }
}
