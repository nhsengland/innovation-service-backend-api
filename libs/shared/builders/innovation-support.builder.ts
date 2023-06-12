import type { EntityManager } from 'typeorm';
import { InnovationSupportEntity } from '../entities/innovation/innovation-support.entity';
import { InnovationEntity } from '../entities/innovation/innovation.entity';
import type { OrganisationUnitUserEntity } from '../entities/organisation/organisation-unit-user.entity';
import { OrganisationUnitEntity } from '../entities/organisation/organisation-unit.entity';
import { InnovationSupportStatusEnum } from '../enums';

export class InnovationSupportBuilder {
  innovationSupport: Partial<InnovationSupportEntity> = {};

  constructor(innovation: InnovationEntity, organisationUnit: OrganisationUnitEntity) {
    this.innovationSupport = {
      innovation: InnovationEntity.new(innovation),
      organisationUnit: OrganisationUnitEntity.new(organisationUnit),
      status: InnovationSupportStatusEnum.WAITING
    };
  }

  setAccessors(accessors: OrganisationUnitUserEntity[]): InnovationSupportBuilder {
    this.innovationSupport.organisationUnitUsers = accessors;
    this.innovationSupport.status =
      accessors.length > 0 ? InnovationSupportStatusEnum.ENGAGING : InnovationSupportStatusEnum.WAITING;
    return this;
  }

  setStatus(status: InnovationSupportStatusEnum): InnovationSupportBuilder {
    this.innovationSupport.status = status;
    return this;
  }

  async build(entityManager: EntityManager): Promise<InnovationSupportEntity> {
    const innovationSupport = await entityManager.getRepository(InnovationSupportEntity).save(this.innovationSupport);
    return innovationSupport;
  }
}
