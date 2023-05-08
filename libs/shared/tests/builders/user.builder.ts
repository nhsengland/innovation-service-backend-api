import { randEmail, randFullName, randPastDate, randUuid } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';

import { UserEntity } from '../../entities/user/user.entity';
import { UserRoleEntity } from '../../entities/user/user-role.entity';
import { OrganisationEntity } from '../../entities/organisation/organisation.entity';
import { OrganisationUnitEntity } from '../../entities/organisation/organisation-unit.entity';
import { ServiceRoleEnum } from '../../enums';

import { BaseBuilder } from './base.builder';

export type TestUserType = {
  id: string;
  identityId: string;
  name: string;
  email: string;
  mobilePhone: null | string;
  isActive: boolean;
  roles: {
    id: string;
    role: ServiceRoleEnum;
    organisation?: { id: string; name: string };
    organisationUnit?: { id: string; name: string };
  }[];
};

export class UserBuilder extends BaseBuilder {
  private user: UserEntity;

  private additionalFields: {
    name: null | string;
    mobilePhone: null | string;
  };

  constructor(entityManager: EntityManager) {
    super(entityManager);

    this.user = UserEntity.new({
      firstTimeSignInAt: randPastDate(),
      identityId: randUuid(),
      serviceRoles: []
    });

    this.additionalFields = {
      name: null,
      mobilePhone: null
    };
  }

  setName(name: string): this {
    this.additionalFields.name = name;
    return this;
  }

  setMobilePhone(phone: string): this {
    this.additionalFields.mobilePhone = phone;
    return this;
  }

  addRole(type: ServiceRoleEnum, organisationId?: string, organisationUnitId?: string): this {

    // TODO: This makes sense in the future when organisations builder exists.
    // if ([ServiceRoleEnum.INNOVATOR].includes(type) && !organisationId) {
    //   throw new Error('Innovator user type need to be in an organisation (even if shadow).');
    // }
    if ([ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR].includes(type) && (!organisationId || !organisationUnitId)) {
      throw new Error('Accessor user types need to be in an organisation and unit.');
    }

    if ([ServiceRoleEnum.ASSESSMENT, ServiceRoleEnum.ADMIN].includes(type) && (organisationId || organisationUnitId)) {
      throw new Error(`Assessment and Admin roles don't take organisation arguments.`);
    }

    this.user.serviceRoles.push(
      UserRoleEntity.new({
        role: type,
        ...(ServiceRoleEnum.INNOVATOR && OrganisationEntity.new({ isShadow: true })),
        ...(organisationId && OrganisationEntity.new({ id: organisationId })),
        ...(organisationUnitId && OrganisationUnitEntity.new({ id: organisationUnitId }))
      })
    );

    return this;
  }

  async save(): Promise<TestUserType> {
    const savedUser = await this.getEntityManager().getRepository(UserEntity).save(this.user);

    const result = await this.getEntityManager()
      .createQueryBuilder(UserEntity, 'user')
      .innerJoinAndSelect('user.serviceRoles', 'userRoles')
      .leftJoinAndSelect('userRoles.organisation', 'organisation')
      .leftJoinAndSelect('userRoles.organisationUnit', 'organisationUnit')
      .where('user.id = :userId', { userId: savedUser.id })
      .getOne();

    if (!result) {
      throw new Error('Error saving/retrieving user information.');
    }

    return {
      id: result.id,
      identityId: result.identityId,
      name: this.additionalFields.name ?? randFullName(),
      email: randEmail(),
      mobilePhone: this.additionalFields.mobilePhone,
      isActive: true,
      roles: this.user.serviceRoles.map(item => ({
        id: item.id,
        role: item.role,
        ...(item.organisation && { organisation: { id: item.organisation.id, name: item.organisation.name } }),
        ...(item.organisationUnit && {
          organisationUnit: { id: item.organisationUnit.id, name: item.organisationUnit.name }
        })
      }))
    };
  }
}
