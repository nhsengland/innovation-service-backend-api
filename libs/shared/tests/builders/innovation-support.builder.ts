import type { EntityManager } from 'typeorm';
import { InnovationEntity, InnovationSupportEntity, OrganisationUnitEntity, UserRoleEntity } from '../../entities';
import { InnovationSupportStatusEnum } from '../../enums';
import { BaseBuilder } from './base.builder';
import type { TestUserType } from './user.builder';

export type TestInnovationSupportType = {
  id: string;
  status: InnovationSupportStatusEnum;
  updatedAt: Date;
  archiveSnapshot: null | { archivedAt: Date; status: InnovationSupportStatusEnum; assignedAccessors: string[] };
  userRoles: string[]
};

export class InnovationSupportBuilder extends BaseBuilder {
  support: InnovationSupportEntity;

  constructor(entityManager: EntityManager) {
    super(entityManager);
    this.support = InnovationSupportEntity.new({
      status: InnovationSupportStatusEnum.UNASSIGNED,
      archiveSnapshot: null,
      userRoles: []
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

  async save(): Promise<TestInnovationSupportType> {
    const savedSupport = await this.getEntityManager()
      .getRepository(InnovationSupportEntity)
      .save({
        ...this.support,
        archiveSnapshot: {
          archivedAt: new Date(),
          status: this.support.status,
          assignedAccessors: this.support.userRoles.map(r => r.id)
        }
      });

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
      archiveSnapshot: result.archiveSnapshot
        ? {
            archivedAt: result.archiveSnapshot.archivedAt,
            status: result.archiveSnapshot.status,
            assignedAccessors: result.archiveSnapshot.assignedAccessors
          }
        : null,
        userRoles: this.support.userRoles.map(r => r.id)
    };
  }
}
