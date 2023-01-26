import { OrganisationUnitEntity, type OrganisationEntity } from '../entities';
import { randCompanyName, randAlpha, randBoolean } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';

export class OrganisationUnitBuilder {
    
  organisationUnit: Partial<OrganisationUnitEntity> = { };

  constructor() {
    this.organisationUnit = {
      name: randCompanyName(),
      acronym: randAlpha({ length: 5 }).join('.'),
      isShadow: randBoolean(),
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