import type { EntityManager } from 'typeorm';
import {
  InnovationEntity,
  InnovationSupportEntity,
  OrganisationUnitEntity,
  OrganisationUnitUserEntity,
} from '../../entities';
import { InnovationSupportStatusEnum } from '../../enums';
import { BaseBuilder } from './base.builder';
import type { TestUserType } from './user.builder';

export type TestInnovationSupportType = {
  id: string;
  status: InnovationSupportStatusEnum;
};

export class InnovationSupportBuilder extends BaseBuilder {
  support: InnovationSupportEntity;

  constructor(entityManager: EntityManager) {
    super(entityManager);
    this.support = InnovationSupportEntity.new({
      status: InnovationSupportStatusEnum.UNASSIGNED,
      organisationUnitUsers: []
    });
  }

  setStatus(status: InnovationSupportStatusEnum): this {
    this.support.status = status;
    return this;
  }

  setInnovation(innovationId: string): this {
    this.support.innovation = InnovationEntity.new({ id: innovationId });
    return this;
  }

  setOrganisationUnit(organisationUnitId: string): this {
    this.support.organisationUnit = OrganisationUnitEntity.new({ id: organisationUnitId });
    return this;
  }

  setAccessors(accessors: TestUserType[]): this {
    for (const accessor of accessors) {
      let organisationUnitUserId: string | undefined = undefined;
      Object.values(accessor.organisations).forEach(organisation => {
        const validUnit = Object.values(organisation.organisationUnits).find(
          unit => unit.id === this.support.organisationUnit.id
        );
        if (validUnit) {
          organisationUnitUserId = validUnit.organisationUnitUser.id;
        }
      });
      if (!organisationUnitUserId) {
        throw new Error(
          'InnovationSupportBuilder::setAccessors: accessor does not have a valid organisationUnitUser in the specified organistaion unit of the support.'
        );
      }

      this.support.organisationUnitUsers.push(OrganisationUnitUserEntity.new({ id: organisationUnitUserId }));
    }
    return this;
  }

  async save(): Promise<TestInnovationSupportType> {
    const savedSupport = await this.getEntityManager().getRepository(InnovationSupportEntity).save(this.support);

    const result = await this.getEntityManager()
      .createQueryBuilder(InnovationSupportEntity, 'support')
      .where('support.id = :supportId', { supportId: savedSupport.id })
      .getOne();

    if (!result) {
      throw new Error('Error saving/retriving support information.');
    }

    return {
      id: result.id,
      status: result.status,
    };
  }
}
