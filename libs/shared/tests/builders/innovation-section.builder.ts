import { InnovationEntity } from '../../entities/innovation/innovation.entity';
import { InnovationSectionEntity } from '../../entities/innovation/innovation-section.entity';
import { BaseBuilder } from './base.builder';
import { InnovationSectionStatusEnum } from '../../enums/innovation.enums';
import { CurrentCatalogTypes } from '../../schemas/innovation-record';
import type { EntityManager } from 'typeorm';

export type TestInnovationSectionType = {
  id: string;
  status: InnovationSectionStatusEnum;
  section: CurrentCatalogTypes.InnovationSections;
  updatedAt: Date;
};

export class InnovationSectionBuilder extends BaseBuilder {
  private section: Partial<InnovationSectionEntity> = {
    status: InnovationSectionStatusEnum.DRAFT,
    section: CurrentCatalogTypes.InnovationSections[0]
  };

  constructor(entityManager: EntityManager) {
    super(entityManager);
  }

  setInnovation(innovationId: string): this {
    this.section.innovation = InnovationEntity.new({ id: innovationId });
    return this;
  }

  setStatus(status: InnovationSectionStatusEnum): this {
    this.section.status = status;
    return this;
  }

  setSection(section: CurrentCatalogTypes.InnovationSections): this {
    this.section.section = section;
    return this;
  }

  async save(): Promise<TestInnovationSectionType> {
    const savedSection = await this.getEntityManager().getRepository(InnovationSectionEntity).save(this.section);

    const result = await this.getEntityManager()
      .createQueryBuilder(InnovationSectionEntity, 'section')
      .where('section.id = :sectionId', { sectionId: savedSection.id })
      .getOne();

    if (!result) {
      throw new Error('InnovationSectionBuilder::save:: Error saving/retriving section information.');
    }

    return {
      id: result.id,
      status: result.status,
      section: result.section,
      updatedAt: result.updatedAt
    };
  }
}
