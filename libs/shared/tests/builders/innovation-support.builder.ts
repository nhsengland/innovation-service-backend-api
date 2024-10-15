import type { EntityManager } from 'typeorm';
import {
  InnovationAssessmentEntity,
  InnovationEntity,
  InnovationSupportEntity,
  OrganisationUnitEntity,
  UserRoleEntity
} from '../../entities';
import { InnovationSupportStatusEnum } from '../../enums';
import { BaseBuilder } from './base.builder';
import type { TestUserType } from './user.builder';
import { randUuid } from '@ngneat/falso';

export type TestInnovationSupportType = {
  id: string;
  status: InnovationSupportStatusEnum;
  updatedAt: Date;
  userRoles: string[];
  startedAt: Date | null;
};

export class InnovationSupportBuilder extends BaseBuilder {
  support: InnovationSupportEntity;

  constructor(entityManager: EntityManager) {
    super(entityManager);
    this.support = InnovationSupportEntity.new({
      status: InnovationSupportStatusEnum.SUGGESTED,
      userRoles: [],
      createdBy: randUuid(),
      createdByUserRole: randUuid(),
      updatedBy: randUuid(),
      updatedByUserRole: randUuid()
    });
  }

  setStatus(status: InnovationSupportStatusEnum): this {
    this.support.status = status;
    return this;
  }

  setInnovation(innovationId: string): this {
    this.support.innovation = InnovationEntity.new({ id: innovationId });
    return this;
  }

  setMajorAssessment(assessmentId: string): this {
    this.support.majorAssessment = InnovationAssessmentEntity.new({ id: assessmentId });
    return this;
  }

  setOrganisationUnit(organisationUnitId: string): this {
    this.support.organisationUnit = OrganisationUnitEntity.new({ id: organisationUnitId });
    return this;
  }

  setAccessors(accessors: TestUserType[]): this {
    for (const accessor of accessors) {
      const validRole = Object.values(accessor.roles).find(
        role => role.organisationUnit?.id === this.support.organisationUnit.id
      );

      if (!validRole) {
        throw new Error(
          'InnovationSupportBuilder::setAccessors: accessor does not have a valid role in the specified organistaion unit of the support.'
        );
      }

      this.support.userRoles.push(UserRoleEntity.new({ id: validRole.id }));
    }
    return this;
  }

  setCreatedAndUpdatedBy(userId: string, roleId: string): this {
    this.support.createdBy = userId;
    this.support.createdByUserRole = roleId;
    this.support.updatedBy = userId;
    this.support.updatedByUserRole = roleId;
    return this;
  }

  setStartedAt(date: Date): this {
    this.support.startedAt = date;
    return this;
  }

  async save(): Promise<TestInnovationSupportType> {
    const required = ['innovation', 'organisationUnit', 'majorAssessment'] as const;
    for (const prop of required) {
      if (!this.support[prop]) {
        throw new Error(`InnovationSupportBuilder::save: ${prop} is required.`);
      }
    }

    if (this.support.status !== InnovationSupportStatusEnum.SUGGESTED && !this.support.startedAt) {
      this.support.startedAt = new Date();
    }

    const savedSupport = await this.getEntityManager().getRepository(InnovationSupportEntity).save(this.support);

    const result = await this.getEntityManager()
      .createQueryBuilder(InnovationSupportEntity, 'support')
      .where('support.id = :supportId', { supportId: savedSupport.id })
      .getOne();

    if (!result) {
      throw new Error('Error saving/retriving support information.');
    }

    return {
      id: result.id,
      status: result.status,
      updatedAt: result.updatedAt,
      userRoles: this.support.userRoles.map(r => r.id),
      startedAt: result.startedAt
    };
  }
}
