import { randAlpha, randCompanyName, randText } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';
import { SYSTEM_CONTEXT } from '../../constants';
import { OrganisationEntity } from '../../entities';
import { OrganisationTypeEnum } from '../../enums';
import { BaseBuilder } from './base.builder';
import type { TestOrganisationUnitType } from './organisation-unit.builder';

export type TestOrganisationType = {
  id: string;
  name: string;
  acronym: string | null;
  summary: string | null;
  isShadow: boolean;
  isActive: boolean;
  units: { [key: string]: TestOrganisationUnitType };
};

export class OrganisationBuilder extends BaseBuilder {
  organisation: OrganisationEntity;

  constructor(entityManager: EntityManager) {
    super(entityManager);

    this.organisation = OrganisationEntity.new({
      createdBy: SYSTEM_CONTEXT.id,
      name: randCompanyName(),
      acronym: randAlpha({ length: 5 }).join('.'),
      isShadow: false,
      summary: randText(),
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

  setInactivatedAt(inactivatedAt: Date): this {
    this.organisation.inactivatedAt = inactivatedAt;
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
      summary: result.summary,
      isShadow: result.isShadow,
      isActive: !result.inactivatedAt,
      units: {}
    };
  }
}
