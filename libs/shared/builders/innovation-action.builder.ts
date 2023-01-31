import { InnovationActionEntity, InnovationSectionEntity, InnovationSupportEntity } from '../entities';
import { InnovationActionStatusEnum } from '../enums';
import { randAlpha, randText } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';

export class InnovationActionBuilder {

  innovationAction: Partial<InnovationActionEntity> = { };

  constructor(innovationSection: InnovationSectionEntity, innovationSupport: InnovationSupportEntity) {
    this.innovationAction = {
      displayId: randAlpha({ length: 3 }).join('.'),
      description: randText(),
      status: InnovationActionStatusEnum.REQUESTED,
      innovationSection: InnovationSectionEntity.new(innovationSection),
      innovationSupport: InnovationSupportEntity.new(innovationSupport),
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

  async build(entityManager: EntityManager): Promise<InnovationActionEntity> {
    const innovationAction = await entityManager.getRepository(InnovationActionEntity).save(this.innovationAction);
    return innovationAction;
  }

}