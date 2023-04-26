import { randAlpha, randText } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';
import {
  InnovationActionEntity,
  InnovationSectionEntity,
  InnovationSupportEntity,
  UserRoleEntity,
} from '../entities';
import { InnovationActionStatusEnum } from '../enums';
import type { DomainContextType } from '../types';

export class InnovationActionBuilder {
  innovationAction: Partial<InnovationActionEntity> = {};

  constructor(
    createdBy: DomainContextType,
    innovationSection: InnovationSectionEntity,
    innovationSupport?: InnovationSupportEntity
  ) {
    this.innovationAction = {
      createdBy: createdBy.id,
      createdByUserRole: UserRoleEntity.new({ id: createdBy.currentRole.id }),
      updatedBy: createdBy.id,
      updatedByUserRole: UserRoleEntity.new({ id: createdBy.currentRole.id }),
      displayId: randAlpha({ length: 3 }).join('.'),
      description: randText(),
      status: InnovationActionStatusEnum.REQUESTED,
      innovationSection: InnovationSectionEntity.new(innovationSection),
      ...(innovationSupport
        ? { innovationSupport: InnovationSupportEntity.new(innovationSupport) }
        : {}),
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

  setUpdatedByUserRole(role: UserRoleEntity): InnovationActionBuilder {
    this.innovationAction.updatedByUserRole = role;
    return this;
  }

  setCreatedByUserRole(role: UserRoleEntity): InnovationActionBuilder {
    this.innovationAction.createdByUserRole = role;
    return this;
  }

  async build(entityManager: EntityManager): Promise<InnovationActionEntity> {
    const innovationAction = await entityManager
      .getRepository(InnovationActionEntity)
      .save(this.innovationAction);
    return innovationAction;
  }
}
