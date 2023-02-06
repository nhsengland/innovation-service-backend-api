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
    };

  }

  ofType(type: ServiceRoleEnum): UserBuilder {
    this.user.serviceRoles?.push(UserRoleEntity.new({ role: type}));
    return this;
  }

  async build(entityManager: EntityManager): Promise<UserEntity> {
    const user = await entityManager.getRepository(UserEntity).save(this.user);
    return user;
  }

}
