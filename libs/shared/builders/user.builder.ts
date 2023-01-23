import { UserEntity } from '../entities';
import { UserTypeEnum } from '../enums';
import { randPastDate, randUuid } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';

export class UserBuilder {

  user: Partial<UserEntity> = { };

  constructor() {
    this.user = {
      firstTimeSignInAt: randPastDate().toISOString(),
      identityId: randUuid(),
      type: UserTypeEnum.INNOVATOR,
      surveyId: randUuid(),
    };

  }

  ofType(type: UserTypeEnum): UserBuilder {
    this.user.type = type;
    return this;
  }

  async build(entityManager: EntityManager): Promise<UserEntity> {
    const user = await entityManager.getRepository(UserEntity).save(this.user);
    return user;
  }

}
