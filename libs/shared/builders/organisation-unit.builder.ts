import { randAlpha, randBoolean, randCompanyName } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';
import { OrganisationUnitEntity } from '../entities/organisation/organisation-unit.entity';
import type { OrganisationEntity } from '../entities/organisation/organisation.entity';

export class OrganisationUnitBuilder {
  organisationUnit: Partial<OrganisationUnitEntity> = {};

  constructor() {
    this.organisationUnit = {
      name: randCompanyName(),
      acronym: randAlpha({ length: 5 }).join('.'),
      isShadow: randBoolean()
    };
  }

  addToOrganisation(organisation: OrganisationEntity): OrganisationUnitBuilder {
    this.organisationUnit.organisation = organisation;
    this.organisationUnit.organisationId = organisation.id;
    return this;
  }

  asShadow(isShadow: boolean): OrganisationUnitBuilder {
    this.organisationUnit.isShadow = isShadow;
    return this;
  }

  async build(entityManager: EntityManager): Promise<OrganisationUnitEntity> {
    const organisationUnit = await entityManager.getRepository(OrganisationUnitEntity).save(this.organisationUnit);
    return organisationUnit;
  }
}
