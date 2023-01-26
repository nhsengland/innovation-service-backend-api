import { randText } from '@ngneat/falso';
import type { EntityManager, Repository } from 'typeorm';
import { type InnovationEntity, OrganisationUnitEntity, type InnovationSectionEntity, type InnovationSupportEntity, UserEntity, OrganisationEntity, OrganisationUserEntity, OrganisationUnitUserEntity, InnovationFileEntity } from '../entities';
import type { AccessorOrganisationRoleEnum, InnovatorOrganisationRoleEnum } from '../enums';
import { InnovationActionBuilder } from './innovation-action.builder';
import { InnovationAssessmentBuilder } from './innovation-assessment.builder';
import { InnovationSectionBuilder } from './innovation-section.builder';
import { InnovationSupportBuilder } from './innovation-support.builder';
import { InnovationBuilder } from './innovation.builder';
import { OrganisationUnitBuilder } from './organisation-unit.builder';
import { OrganisationBuilder } from './organisation.builder';
import { UserBuilder } from './user.builder';

export class TestDataBuilder {


  public repositories: {repo: Repository<any>, data: any}[] = [];

  stack: Promise<[]> = Promise.resolve([]);

  constructor() {
  }

  createUser(): UserBuilder {
    return new UserBuilder();
  }
  
  createOrganisation(): OrganisationBuilder {
    return new OrganisationBuilder();
  }

  createOrganisationUnit(): OrganisationUnitBuilder {
    return new OrganisationUnitBuilder();
  }

  createInnovation(): InnovationBuilder {
    return new InnovationBuilder();
  }

  createSections(innovation: InnovationEntity): InnovationSectionBuilder {
    return new InnovationSectionBuilder( innovation);
  }

  createAssessment(innovation: InnovationEntity): InnovationAssessmentBuilder {
    return new InnovationAssessmentBuilder( innovation);
  }

  createSupport(innovation: InnovationEntity, organisationUnit: OrganisationUnitEntity): InnovationSupportBuilder {
    return new InnovationSupportBuilder( innovation, organisationUnit );
  }

  createAction(innovationSection: InnovationSectionEntity, innovationSupport: InnovationSupportEntity): InnovationActionBuilder {
    return new InnovationActionBuilder( innovationSection, innovationSupport);
  }

  async addUserToOrganisation(a: UserEntity, b: OrganisationEntity, role: AccessorOrganisationRoleEnum | InnovatorOrganisationRoleEnum, entityManager: EntityManager): Promise<OrganisationUserEntity> {
    const orgUser = OrganisationUserEntity.new({
      organisation: OrganisationEntity.new(b),
      user: UserEntity.new(a),
      role: role,
    });

    return entityManager.getRepository(OrganisationUserEntity).save(orgUser);
  }

  async addUserToOrganisationUnit(a: OrganisationUserEntity, b: OrganisationUnitEntity, entityManager: EntityManager): Promise<OrganisationUnitUserEntity> {
    const orgUnitUser = OrganisationUnitUserEntity.new({
      organisationUnit: OrganisationUnitEntity.new(b),
      organisationUser: OrganisationUserEntity.new(a),
    });

    return entityManager.getRepository(OrganisationUnitUserEntity).save(orgUnitUser);
  }

  async addFileToInnovation(i: InnovationEntity, entityManager: EntityManager): Promise<InnovationFileEntity> {
    const file = InnovationFileEntity.new({
      innovation: i,
      displayFileName: randText()
    });

    return entityManager.getRepository(InnovationFileEntity).save(file)
  }

}
