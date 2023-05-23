import {
  InnovationSupportEntity,
  InnovationEntity,
  OrganisationUnitEntity,
  type OrganisationUnitUserEntity
} from '../entities';
import { InnovationSupportStatusEnum } from '../enums';
import type { EntityManager } from 'typeorm';

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
