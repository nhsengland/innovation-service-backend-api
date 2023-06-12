import { randPastDate, randUuid } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';

import { ServiceRoleEnum } from '../enums';

import type { OrganisationUnitEntity } from '../entities/organisation/organisation-unit.entity';
import type { OrganisationEntity } from '../entities/organisation/organisation.entity';
import { UserRoleEntity } from '../entities/user/user-role.entity';
import { UserEntity } from '../entities/user/user.entity';
import { BaseBuilder } from './base.builder';

export class UserBuilder extends BaseBuilder {
  user: UserEntity;

  constructor(entityManager: EntityManager) {
    super(entityManager);

    this.user = UserEntity.new({
      firstTimeSignInAt: randPastDate(),
      identityId: randUuid(),
      serviceRoles: []
    });
  }

  getUser(): UserEntity {
    return this.user;
  }
  getRoles(): UserRoleEntity[] {
    return this.user.serviceRoles;
  }

  addRole(type: ServiceRoleEnum, organisation?: OrganisationEntity, organisationUnit?: OrganisationUnitEntity): this {
    if (type === ServiceRoleEnum.INNOVATOR && !organisation) throw new Error('Innovator role must have organisation');
    if (
      (type === ServiceRoleEnum.ACCESSOR || type === ServiceRoleEnum.QUALIFYING_ACCESSOR) &&
      !organisation &&
      !organisationUnit
    )
      throw new Error('Accessor role must have both organisation and organisation unit');
    this.user.serviceRoles.push(
      UserRoleEntity.new({
        role: type,
        organisation: organisation ?? null,
        organisationUnit: organisationUnit ?? null
      })
    );
    return this;
  }

  // // setOrganisation(organitins) {   }

  // assotiateOrganisation(organitins) {   }

  // createInnovartoShortcut() {

  //   eruitne this.assotivca().fdsfasdf()
  // }

  async save(): Promise<this> {
    await this.getEntityManager().getRepository(UserEntity).save(this.user);
    return this;

    // const result = await this.getEntityManager().createQueryBuilder(UserEntity, 'user')
    //   .innerJoinAndSelect('user.serviceRoles', 'roles')
    //   .leftJoinAndSelect('roles.organisationUnit', 'organisationUnit')
    //   .leftJoinAndSelect('roles.organisation', 'organisation')
    //   .where('user.id = :userId', { userId: user.id })
    //   .getOne();

    // if (!result) {
    //   throw new Error('Error whatever');
    // }

    // return user;
  }
}
