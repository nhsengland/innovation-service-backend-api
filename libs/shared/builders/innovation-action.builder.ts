import { randAlpha, randText } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';
import { InnovationActionEntity, InnovationSectionEntity, InnovationSupportEntity } from '../entities';
import { InnovationActionStatusEnum } from '../enums';

export class InnovationActionBuilder {

  innovationAction: Partial<InnovationActionEntity> = {};

  constructor(createdBy: string, innovationSection: InnovationSectionEntity, innovationSupport?: InnovationSupportEntity) {
    this.innovationAction = {
      createdBy: createdBy,
      updatedBy: createdBy,
      displayId: randAlpha({ length: 3 }).join('.'),
      description: randText(),
      status: InnovationActionStatusEnum.REQUESTED,
      innovationSection: InnovationSectionEntity.new(innovationSection),
      ...(innovationSupport ? { innovationSupport: InnovationSupportEntity.new(innovationSupport) } : {}),
    };
  }

  setStatus(status: InnovationActionStatusEnum): InnovationActionBuilder {
    this.innovationAction.status = status;
    return this;
  }

  setDescription(): InnovationActionBuilder {
    this.innovationAction.description = randText();
    return this;
  }

  setCreatedBy(id: string): InnovationActionBuilder {
    this.innovationAction.createdBy = id;
    return this;
  }

  setUpdatedBy(id: string): InnovationActionBuilder {
    this.innovationAction.updatedBy = id;
    return this;
  }

  async build(entityManager: EntityManager): Promise<InnovationActionEntity> {
    const innovationAction = await entityManager.getRepository(InnovationActionEntity).save(this.innovationAction);
    return innovationAction;
  }

}
