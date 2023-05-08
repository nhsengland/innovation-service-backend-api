import { randEmail, randPhoneNumber, randUserName } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';
import { UserEntity } from '../entities';
import { DomainUsersService } from '../services';
import type { DomainUserInfoType } from '../types';

export class MockBuilder {
  private _spies: jest.SpyInstance[] = [];

  constructor() {}

  public reset(): void {
    for (const spy of this._spies) {
      spy.mockReset();
      spy.mockRestore();
    }
  }

  public Spies(): jest.SpyInstance[] {
    return this._spies;
  }

  public addSpy(spy: jest.SpyInstance): MockBuilder {
    this._spies.push(spy);
    return this;
  }

  mockDomainUser(user: UserEntity): DomainUserInfoBuilder {
    const data = {
      id: user.id,
      identityId: user.identityId,
      isActive: user.lockedAt === null,
      lockedAt: user.lockedAt,
      displayName: randUserName(),
      email: randEmail(),
      firstTimeSignInAt: user.firstTimeSignInAt,
      passwordResetAt: null,
      phone: randPhoneNumber(),
      // roles: [UserRoleEntity.new({ id: randUuid(), role: ServiceRoleEnum.INNOVATOR })], // Was like this before, not needed
      roles: user.serviceRoles,
      organisations: []
    } as DomainUserInfoType;

    return new DomainUserInfoBuilder(data, this);
  }
}

class DomainUserInfoBuilder {
  user: DomainUserInfoType;
  builder: MockBuilder;
  constructor(user: DomainUserInfoType, builder: MockBuilder) {
    this.user = user;
    this.builder = builder;
  }

  async build(entityManager: EntityManager): Promise<MockBuilder> {
    const user = await entityManager
      .createQueryBuilder(UserEntity, 'user')
      .leftJoinAndSelect('user.serviceRoles', 'roles')
      .leftJoinAndSelect('user.userOrganisations', 'organisationUsers')
      .leftJoinAndSelect('organisationUsers.organisation', 'organisation')
      .leftJoinAndSelect('organisationUsers.userOrganisationUnits', 'organisationUnitUsers')
      .leftJoinAndSelect('organisationUnitUsers.organisationUnit', 'organisationUnit')
      .where('user.id = :id', { id: this.user.id })
      .getOne();

    const userOrganisations = await user?.userOrganisations;
    const organisationUser = userOrganisations?.find(_ => true);
    const organisation = organisationUser?.organisation;

    // this.user.roles = user?.serviceRoles ?? []; // Was like this before, not needed

    if (organisation) {
      const organisationUnitUser = organisationUser.userOrganisationUnits.find(_ => true);
      const organisationUnit = organisationUnitUser?.organisationUnit;

      this.user.organisations = [
        {
          id: organisation.id,
          name: organisation.name,
          acronym: organisation.acronym,
          role: organisationUser.role,
          isShadow: organisation.isShadow,
          size: organisation.size,
          description: organisation.description,
          registrationNumber: organisation.registrationNumber,
          organisationUnits: organisationUnit
            ? [
                {
                  id: organisationUnit.id,
                  name: organisationUnit.name,
                  acronym: organisationUnit.acronym,
                  organisationUnitUser: {
                    id: organisationUnitUser.id
                  }
                }
              ]
            : []
        }
      ];
    }

    this.builder.addSpy(jest.spyOn(DomainUsersService.prototype, 'getUserInfo').mockResolvedValue(this.user));
    return this.builder;
  }
}
