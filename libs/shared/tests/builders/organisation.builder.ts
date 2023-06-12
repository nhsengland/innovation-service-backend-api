import { OrganisationEntity } from '../../entities';
import { OrganisationTypeEnum } from '../../enums';
import { randCompanyName, randAlpha } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';
import { BaseBuilder } from './base.builder';
import type { TestOrganisationUnitType } from './organisation-unit.builder';

export type TestOrganisationType = {
  id: string;
  name: string;
  acronym: string | null;
  isShadow: boolean;
  units: { [key: string]: TestOrganisationUnitType };
};

export class OrganisationBuilder extends BaseBuilder {
  organisation: OrganisationEntity;

  constructor(entityManager: EntityManager) {
    super(entityManager);

    this.organisation = OrganisationEntity.new({
      name: randCompanyName(),
      acronym: randAlpha({ length: 5 }).join('.'),
      isShadow: false,
      type: OrganisationTypeEnum.ACCESSOR
    });
  }

  setName(name: string): this {
    this.organisation.name = name;
    return this;
  }

  ofType(type: OrganisationTypeEnum): OrganisationBuilder {
    this.organisation.type = type;
    return this;
  }

  asShadow(isShadow: boolean): OrganisationBuilder {
    this.organisation.isShadow = isShadow;
    this.organisation.type = OrganisationTypeEnum.INNOVATOR;
    return this;
  }

  async save(): Promise<TestOrganisationType> {
    const savedOrganisation = await this.getEntityManager().getRepository(OrganisationEntity).save(this.organisation);

    const result = await this.getEntityManager()
      .createQueryBuilder(OrganisationEntity, 'organisation')
      .where('organisation.id = :orgId', { orgId: savedOrganisation.id })
      .getOne();

    if (!result) {
      throw new Error('Error saving/retrieving organisation information.');
    }

    return {
      id: result.id,
      name: result.name,
      acronym: result.acronym,
      isShadow: result.isShadow,
      units: {}
    };
  }
}
