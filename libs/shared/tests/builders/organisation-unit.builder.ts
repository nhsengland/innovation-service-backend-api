import { OrganisationUnitEntity, OrganisationEntity } from '../../entities';
import { randCompanyName, randAlpha, randBoolean } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';
import { BaseBuilder } from './base.builder';

export type TestOrganisationUnitType = {
  id: string;
  name: string;
  acronym: string;
  isShadow: boolean;
  isActive: boolean;
};

export class OrganisationUnitBuilder extends BaseBuilder {
  organisationUnit: OrganisationUnitEntity;

  constructor(entityManager: EntityManager) {
    super(entityManager);

    this.organisationUnit = OrganisationUnitEntity.new({
      name: randCompanyName(),
      acronym: randAlpha({ length: 5 }).join('.'),
      isShadow: randBoolean()
    });
  }

  addToOrganisation(organisationId: string): this {
    const organisation = OrganisationEntity.new({ id: organisationId });

    this.organisationUnit.organisation = organisation;
    this.organisationUnit.organisationId = organisation.id;
    return this;
  }

  asShadow(isShadow: boolean): this {
    this.organisationUnit.isShadow = isShadow;
    return this;
  }

  setName(name: string): this {
    this.organisationUnit.name = name;
    return this;
  }

  setInactivatedAt(inactivatedAt: Date): this {
    this.organisationUnit.inactivatedAt = inactivatedAt;
    return this;
  }

  async save(): Promise<TestOrganisationUnitType> {
    if (!this.organisationUnit.organisation) {
      throw new Error('Organisation unit needs to be associated to an organisation');
    }
    const savedUnit = await this.getEntityManager().getRepository(OrganisationUnitEntity).save(this.organisationUnit);

    const result = await this.getEntityManager()
      .createQueryBuilder(OrganisationUnitEntity, 'unit')
      .where('unit.id = :unitId', { unitId: savedUnit.id })
      .getOne();

    if (!result) {
      throw new Error('Error saving/retrieving organisation unit information.');
    }
    return {
      id: result.id,
      name: result.name,
      acronym: result.acronym,
      isShadow: result.isShadow,
      isActive: !result.inactivatedAt
    };
  }
}
