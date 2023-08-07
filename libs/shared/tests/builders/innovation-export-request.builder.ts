import { randText } from '@ngneat/falso';
import type { DeepPartial, EntityManager } from 'typeorm';

import { InnovationExportRequestEntity } from '../../entities/innovation/innovation-export-request.entity';
import { InnovationExportRequestStatusEnum } from '../../enums/innovation.enums';
import { TranslationHelper } from '../../helpers';
import { BaseBuilder } from './base.builder';

export type TestInnovationExportRequestType = {
  id: string;
  status: InnovationExportRequestStatusEnum;
  requestReason: string;
  rejectReason: string | null;
  createdBy: {
    id: string;
    unitId?: string;
    unitName?: string;
  };
  updatedAt: Date;
};

export class InnovationExportRequestBuilder extends BaseBuilder {
  private request: DeepPartial<InnovationExportRequestEntity> = {
    status: InnovationExportRequestStatusEnum.PENDING,
    requestReason: randText({ charCount: 10 })
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
    this.request.rejectReason =
      status === InnovationExportRequestStatusEnum.REJECTED ? randText({ charCount: 10 }) : null;
    return this;
  }

  setCreatedBy(userId: string, roleId: string): this {
    this.request.createdBy = userId;
    this.request.updatedBy = userId;
    this.request.createdByUserRole = { id: roleId };
    return this;
  }

  async save(): Promise<TestInnovationExportRequestType> {
    if (!this.request.createdBy) {
      throw new Error(`innovationExportBuilder::save:: can't save export request without createdBy`);
    }

    if (!this.request.createdByUserRole) {
      throw new Error(`innovationExportBuilder::save:: can't save export request without user role`);
    }

    const savedRequest = await this.getEntityManager().getRepository(InnovationExportRequestEntity).save(this.request);

    const result = await this.getEntityManager()
      .createQueryBuilder(InnovationExportRequestEntity, 'request')
      .innerJoinAndSelect('request.createdByUserRole', 'userRole')
      .leftJoinAndSelect('userRole.organisationUnit', 'unit')
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
        unitId: result.createdByUserRole.organisationUnitId,
        unitName: result.createdByUserRole.organisation?.name ?? TranslationHelper.translate('TEAMS.ASSESSMENT')
      },
      updatedAt: result.updatedAt
    };
  }
}
