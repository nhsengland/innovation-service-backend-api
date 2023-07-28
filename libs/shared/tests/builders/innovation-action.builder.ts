import { randAlpha, randText } from '@ngneat/falso';
import type { DeepPartial, EntityManager } from 'typeorm';
import { InnovationActionEntity, InnovationSectionEntity, UserRoleEntity } from '../../entities';
import { InnovationActionStatusEnum } from '../../enums';
import type { CurrentCatalogTypes } from '../../schemas/innovation-record';
import { BaseBuilder } from './base.builder';

export type TestInnovationActionType = {
  id: string;
  displayId: string;
  status: InnovationActionStatusEnum;
  section: CurrentCatalogTypes.InnovationSections;
  updatedAt: Date;
};

export class InnovationActionBuilder extends BaseBuilder {
  innovationAction: DeepPartial<InnovationActionEntity>;

  constructor(entityManager: EntityManager) {
    super(entityManager);
    this.innovationAction = {
      displayId: randAlpha({ length: 3 }).join('.'),
      description: randText(),
      status: InnovationActionStatusEnum.REQUESTED
    };
  }

  setCreatedBy(userId: string): this {
    this.innovationAction.createdBy = userId;
    return this;
  }

  setInnovationSection(sectionId: string): this {
    this.innovationAction.innovationSection = InnovationSectionEntity.new({ id: sectionId });
    return this;
  }

  setStatus(status: InnovationActionStatusEnum): this {
    this.innovationAction.status = status;
    return this;
  }

  setDescription(): this {
    this.innovationAction.description = randText();
    return this;
  }

  setUpdatedBy(id: string): this {
    this.innovationAction.updatedBy = id;
    return this;
  }

  setUpdatedByUserRole(roleId: string): this {
    this.innovationAction.updatedByUserRole = UserRoleEntity.new({ id: roleId });
    return this;
  }

  setCreatedByUserRole(roleId: string): this {
    this.innovationAction.createdByUserRole = UserRoleEntity.new({ id: roleId });
    return this;
  }

  setSupport(supportId: string): this {
    this.innovationAction.innovationSupport = { id: supportId };
    return this;
  }

  async save(): Promise<TestInnovationActionType> {
    const savedAction = await this.getEntityManager().getRepository(InnovationActionEntity).save(this.innovationAction);

    const result = await this.getEntityManager()
      .createQueryBuilder(InnovationActionEntity, 'action')
      .innerJoinAndSelect('action.innovationSection', 'section')
      .where('action.id = :actionId', { actionId: savedAction.id })
      .getOne();

    if (!result) {
      throw new Error('Error saving/retriving action information.');
    }

    return {
      id: result.id,
      displayId: result.displayId,
      status: result.status,
      section: result.innovationSection.section,
      updatedAt: result.updatedAt
    };
  }
}
