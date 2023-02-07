import { UserEntity, UserRoleEntity } from '../entities';
import { randPastDate, randUuid } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';
import type { ServiceRoleEnum } from '../enums';

export class UserBuilder {

  user: Partial<UserEntity> = { };

  constructor() {
    this.user = {
      firstTimeSignInAt: randPastDate().toISOString(),
      identityId: randUuid(),
      surveyId: randUuid(),
      serviceRoles: [],
    };

  }

  ofType(type: ServiceRoleEnum): UserBuilder {
    
    if (!this.user.serviceRoles) {
      this.user.serviceRoles = [];
    }

    this.user.serviceRoles.push(UserRoleEntity.new({ role: type }));
    return this;
  }

  async build(entityManager: EntityManager): Promise<UserEntity> {

    const user = await entityManager.getRepository(UserEntity).save(UserEntity.new(this.user));

    const result = await entityManager.createQueryBuilder(UserEntity, 'user')
      .innerJoinAndSelect('user.serviceRoles', 'roles')
      .leftJoinAndSelect('roles.organisationUnit', 'organisationUnit')
      .leftJoinAndSelect('roles.organisation', 'organisation')
      .where('user.id = :userId', {userId: user.id })
      .getOne();

    if (!result) {
      throw new Error('Error whatever');
    }

    return result;
  }

}
