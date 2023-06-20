import { randCountry, randProduct } from '@ngneat/falso';
import type { DeepPartial, EntityManager } from 'typeorm';

import { InnovationEntity } from '../../entities/innovation/innovation.entity';
import { InnovationSectionStatusEnum, InnovationStatusEnum } from '../../enums/innovation.enums';
import { NotFoundError } from '../../errors/errors.config';
import { UserErrorsEnum } from '../../errors/errors.enums';

import type { CurrentCatalogTypes } from '../../schemas/innovation-record';
import { BaseBuilder } from './base.builder';
import type { TestOrganisationType } from './organisation.builder';

export type TestInnovationType = {
  id: string;
  name: string;
  ownerId: string;
  sections: Map<
    CurrentCatalogTypes.InnovationSections,
    { id: string; status: InnovationSectionStatusEnum; section: CurrentCatalogTypes.InnovationSections }
  >;
  sharedOrganisations: { id: string; name: string }[];
};

export class InnovationBuilder extends BaseBuilder {
  private innovation: DeepPartial<InnovationEntity> = {
    name: randProduct().title,
    countryName: randCountry(),
    status: InnovationStatusEnum.CREATED,
    owner: null,
    assessments: [],
    organisationShares: [],
    sections: [],
    transfers: []
  };

  constructor(entityManager: EntityManager) {
    super(entityManager);
  }

  setOwner(userId: string): this {
    this.innovation.owner = { id: userId };
    return this;
  }

  setStatus(status: InnovationStatusEnum): this {
    this.innovation.status = status;
    return this;
  }

  addSection(section: CurrentCatalogTypes.InnovationSections, status?: InnovationSectionStatusEnum): this {
    this.innovation.sections = [
      ...(this.innovation.sections ?? []),
      { section: section, status: status ?? InnovationSectionStatusEnum.SUBMITTED }
    ];
    return this;
  }

  shareWith(organisations: TestOrganisationType[]): this {
    this.innovation.organisationShares = organisations.map(org => ({ id: org.id }));
    return this;
  }

  async save(): Promise<TestInnovationType> {
    const savedInnovation = await this.getEntityManager()
      .getRepository(InnovationEntity)
      .save({
        ...this.innovation,
        sections: this.innovation.sections
      });

    const result = await this.getEntityManager()
      .createQueryBuilder(InnovationEntity, 'innovation')
      .leftJoinAndSelect('innovation.owner', 'owner')
      .leftJoinAndSelect('innovation.sections', 'sections')
      .leftJoinAndSelect('innovation.transfers', 'transfers')
      .leftJoinAndSelect('innovation.collaborators', 'collaborators')
      .leftJoinAndSelect('innovation.organisationShares', 'organisationShares')
      .where('innovation.id = :id', { id: savedInnovation.id })
      .getOne();

    if (!result) {
      throw new Error('Error saving/retriving innovation information.');
    }

    // Sanity check but this requirement might actually change in the future. Builder forces owner for now
    if (!result.owner) {
      throw new NotFoundError(UserErrorsEnum.USER_SQL_NOT_FOUND);
    }

    return {
      id: result.id,
      name: result.name,
      ownerId: result.owner.id,
      sections: new Map(result.sections.map(s => [s['section'], s])),
      sharedOrganisations: result.organisationShares.map(s => ({ id: s.id, name: s.name }))
    };
  }
}
