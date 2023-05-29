import { randAbbreviation, randCompanyName, randEmail, randFullName, randPastDate, randUuid } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';

import { UserEntity } from '../../entities/user/user.entity';
import { UserRoleEntity } from '../../entities/user/user-role.entity';
import { OrganisationEntity } from '../../entities/organisation/organisation.entity';
import { OrganisationUnitEntity } from '../../entities/organisation/organisation-unit.entity';
import { OrganisationUserEntity } from '../../entities/organisation/organisation-user.entity';
import {
  AccessorOrganisationRoleEnum,
  InnovatorOrganisationRoleEnum,
  OrganisationTypeEnum,
  ServiceRoleEnum
} from '../../enums';

import { BaseBuilder } from './base.builder';

export type TestUserType = {
  id: string;
  identityId: string;
  name: string;
  email: string;
  mobilePhone: null | string;
  isActive: boolean;
  lockedAt: null | Date;
  roles: {
    id: string;
    role: ServiceRoleEnum;
    lockedAt: null | Date;
    organisation?: { id: string; name: string; acronym: null | string };
    organisationUnit?: { id: string; name: string; acronym: string };
  }[];
  organisations: {
    id: string;
    name: string;
    acronym: null | string;
    role: InnovatorOrganisationRoleEnum | AccessorOrganisationRoleEnum;
    isShadow: boolean;
    size: null | string;
    description: null | string;
    registrationNumber: null | string;
    organisationUnits: { id: string; name: string; acronym: string; organisationUnitUser: { id: string } }[];
  }[];
};

export class UserBuilder extends BaseBuilder {
  private user: UserEntity;

  private additionalFields: {
    name: null | string;
    mobilePhone: null | string;
  };

  private additionalEntities: {
    organisation?: OrganisationEntity;
  } = {};

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

  createInnovatorAndOrganisation(data?: { name?: string; isShadow?: boolean }): this {
    this.additionalEntities.organisation = OrganisationEntity.new({
      type: OrganisationTypeEnum.INNOVATOR,
      name: data?.name ?? randCompanyName(),
      acronym: randAbbreviation(),
      isShadow: data?.isShadow !== undefined ? data.isShadow : true
    });
    return this;
  }

  addRole(type: ServiceRoleEnum, organisationId?: string, organisationUnitId?: string): this {
    if ([ServiceRoleEnum.INNOVATOR].includes(type) && !organisationId) {
      throw new Error('UserBuilder::addRole: Innovator user type need to be in an organisation (even if shadow).');
    }

    if (
      [ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR].includes(type) &&
      (!organisationId || !organisationUnitId)
    ) {
      throw new Error('UserBuilder::addRole: Accessor user types need to be in an organisation and unit.');
    }

    if ([ServiceRoleEnum.ASSESSMENT, ServiceRoleEnum.ADMIN].includes(type) && (organisationId || organisationUnitId)) {
      throw new Error(`UserBuilder::addRole: Assessment and Admin roles don't take organisation arguments.`);
    }

    this.user.serviceRoles.push(
      UserRoleEntity.new({
        role: type,
        // ...(type === ServiceRoleEnum.INNOVATOR && {
        //   organisation: OrganisationEntity.new({ name: randAbbreviation(), isShadow: true })
        // }),
        ...(organisationId && { organisation: OrganisationEntity.new({ id: organisationId }) }),
        ...(organisationUnitId && { organisationUnit: OrganisationUnitEntity.new({ id: organisationUnitId }) })
      })
    );

    return this;
  }

  async save(): Promise<TestUserType> {

    const dbUser = await this.getEntityManager().getRepository(UserEntity).save(this.user);

    if (this.additionalEntities.organisation) {

      const dbOrganisation = await this.getEntityManager().save(
        OrganisationEntity,
        this.additionalEntities.organisation
      );

      await this.getEntityManager().save(
        OrganisationUserEntity,
        OrganisationUserEntity.new({
          organisation: dbOrganisation,
          user: dbUser,
          role: InnovatorOrganisationRoleEnum.INNOVATOR_OWNER
          // createdBy: dbUser.id,
          // updatedBy: dbUser.id
        })
      );

      await this.getEntityManager().save(
        UserRoleEntity,
        UserRoleEntity.new({
          user: dbUser,
          role: ServiceRoleEnum.INNOVATOR,
          organisation: dbOrganisation
        })
      );

    }

    const result = await this.getEntityManager()
      .createQueryBuilder(UserEntity, 'user')
      .select([
        'user.id',
        'user.identityId',
        'user.lockedAt',
        'user.firstTimeSignInAt',

        'roles.id',
        'roles.role',
        'roles.lockedAt',
        'roleOrganisation.id',
        'roleOrganisation.name',
        'roleOrganisation.acronym',
        'roleOrganisationUnit.id',
        'roleOrganisationUnit.name',
        'roleOrganisationUnit.acronym',

        'userOrganisations.id',
        'userOrganisations.role',
        'organisation.id',
        'organisation.name',
        'organisation.acronym',
        'organisation.size',
        'organisation.isShadow',
        'organisation.description',
        'organisation.registrationNumber',
        'userOrganisationUnits.id',
        'organisationUnit.id',
        'organisationUnit.name',
        'organisationUnit.acronym'
      ])
      .innerJoin('user.serviceRoles', 'roles')
      .leftJoin('roles.organisation', 'roleOrganisation')
      .leftJoin('roles.organisationUnit', 'roleOrganisationUnit')
      .leftJoin('user.userOrganisations', 'userOrganisations')
      .leftJoin('userOrganisations.organisation', 'organisation')
      .leftJoin('userOrganisations.userOrganisationUnits', 'userOrganisationUnits')
      .leftJoin('userOrganisationUnits.organisationUnit', 'organisationUnit')
      .where('user.id = :userId', { userId: dbUser.id })
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
      lockedAt: result.lockedAt,
      roles: result.serviceRoles.map(item => ({
        id: item.id,
        role: item.role,
        lockedAt: item.lockedAt,
        ...(item.organisation && {
          organisation: { id: item.organisation.id, name: item.organisation.name, acronym: item.organisation.acronym }
        }),
        ...(item.organisationUnit && {
          organisationUnit: {
            id: item.organisationUnit.id,
            name: item.organisationUnit.name,
            acronym: item.organisationUnit.acronym
          }
        })
      })),
      organisations: (await result.userOrganisations).map(userOrganisation => {
        const organisation = userOrganisation.organisation;
        const organisationUnits = userOrganisation.userOrganisationUnits;
        return {
          id: organisation.id,
          name: organisation.name,
          acronym: organisation.acronym,
          size: organisation.size,
          role: userOrganisation.role,
          isShadow: organisation.isShadow,
          description: organisation.description,
          registrationNumber: organisation.registrationNumber,
          organisationUnits: organisationUnits.map(item => ({
            id: item.organisationUnit.id,
            acronym: item.organisationUnit.acronym,
            name: item.organisationUnit.name,
            organisationUnitUser: { id: item.id }
          }))
        };
      })
    };

  }

}
