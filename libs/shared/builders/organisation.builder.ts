import { OrganisationEntity } from '../entities';
import { OrganisationTypeEnum } from '../enums';
import { randCompanyName, randAlpha, randBoolean } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';

export class OrganisationBuilder {
  organisation: Partial<OrganisationEntity> = {};

  constructor() {
    this.organisation = {
      name: randCompanyName(),
      acronym: randAlpha({ length: 5 }).join('.'),
      isShadow: randBoolean(),
      type: OrganisationTypeEnum.ACCESSOR,
    };
  }

  ofType(type: OrganisationTypeEnum): OrganisationBuilder {
    this.organisation.type = type;
    return this;
  }

  asShadow(isShadow: boolean): OrganisationBuilder {
    this.organisation.isShadow = isShadow;
    return this;
  }

  async build(entityManager: EntityManager): Promise<OrganisationEntity> {
    const organisation = await entityManager
      .getRepository(OrganisationEntity)
      .save(this.organisation);
    return organisation;
  }
}
