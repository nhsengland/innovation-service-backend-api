import { InnovationSectionEntity, type InnovationEntity } from '../entities';
import { InnovationSectionEnum, InnovationSectionStatusEnum } from '../enums';
import type { EntityManager } from 'typeorm';

export class InnovationSectionBuilder {

  innovationSection: Partial<InnovationSectionEntity> = { };
  innovation: InnovationEntity;
  private generateAll = false;

  constructor(innovation: InnovationEntity) {
    this.innovationSection = {
      section: InnovationSectionEnum.COMPARATIVE_COST_BENEFIT,
      status: InnovationSectionStatusEnum.NOT_STARTED,
      innovation: innovation,
    };
    
    this.innovation = innovation;
  }

  setStatus(status: InnovationSectionStatusEnum): InnovationSectionBuilder {
    this.innovationSection.status = status;
    return this;
  }

  setSection(section: InnovationSectionEnum): InnovationSectionBuilder {
    this.innovationSection.section = section;
    return this;
  }

  createAll(): InnovationSectionBuilder {
    this.generateAll = true;
    return this;
  }

  async build(entityManager: EntityManager): Promise<InnovationSectionEntity[]> {

 
    if (!this.generateAll) {
      const innovationSection = await entityManager.getRepository(InnovationSectionEntity).save(this.innovationSection);
      return [innovationSection];
    }

    const sections = [];
     
    for (const section of Object.values(InnovationSectionEnum)) {
      const sectionData = InnovationSectionEntity.new({
        innovation: this.innovation,
        section,
        status: InnovationSectionStatusEnum.SUBMITTED,
      });

      sections.push(await entityManager.getRepository(InnovationSectionEntity).save(sectionData));
    }
    
   return sections;
    
  }
}
