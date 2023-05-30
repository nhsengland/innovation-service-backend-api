/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { randAbbreviation, randCompanyName, randEmail, randFullName, randPastDate, randUuid } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';

import { OrganisationUnitUserEntity } from '../../entities';
import { OrganisationUnitEntity } from '../../entities/organisation/organisation-unit.entity';
import { OrganisationUserEntity } from '../../entities/organisation/organisation-user.entity';
import { OrganisationEntity } from '../../entities/organisation/organisation.entity';
import { UserRoleEntity } from '../../entities/user/user-role.entity';
import { UserEntity } from '../../entities/user/user.entity';
import {
  AccessorOrganisationRoleEnum,
  InnovatorOrganisationRoleEnum,
  OrganisationTypeEnum
} from '../../enums/organisation.enums';
import { ServiceRoleEnum, UserStatusEnum } from '../../enums/user.enums';
import type { RoleType } from '../../types';

import { BaseBuilder } from './base.builder';

export type TestUserOrganisationUnitType = {
  id: string;
  acronym: string;
  name: string;
  organisationUnitUser: { id: string };
};

export type TestUserOrganisationsType = {
  id: string;
  name: string;
  acronym: string | null;
  isShadow: boolean;
  description: string | null;
  registrationNumber: string | null;
  role: InnovatorOrganisationRoleEnum | AccessorOrganisationRoleEnum;
  size: string | null;
  organisationUnits: { [key: string]: TestUserOrganisationUnitType };
};

export type TestUserType = {
  id: string;
  identityId: string;
  name: string;
  email: string;
  mobilePhone: null | string;
  isActive: boolean;
  lockedAt: null | Date;
  roles: {
    [key: string]: RoleType;
  };
  organisations: { [key: string]: TestUserOrganisationsType };
};

export class UserBuilder extends BaseBuilder {
  private user: UserEntity;

  private additionalFields: {
    name: null | string;
    mobilePhone: null | string;
  };

  private rolesToAdd: {
    key: string;
    role: ServiceRoleEnum;
    organisationId?: string;
    organisationUnitId?: string;
  }[] = [];

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

  addRole(type: ServiceRoleEnum, roleName: string, organisationId?: string, organisationUnitId?: string): this {
    if (
      [ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR].includes(type) &&
      (!organisationId || !organisationUnitId)
    ) {
      throw new Error('UserBuilder::addRole: Accessor user types need to be in an organisation and unit.');
    }

    if (type === ServiceRoleEnum.INNOVATOR && organisationUnitId) {
      throw new Error(`UserBuilder::addRole: Innovator user types don't take organisation units`);
    }

    if ([ServiceRoleEnum.ASSESSMENT, ServiceRoleEnum.ADMIN].includes(type) && (organisationId || organisationUnitId)) {
      throw new Error(`UserBuilder::addRole: Assessment and Admin roles don't take organisation arguments.`);
    }

    this.rolesToAdd.push({
      key: roleName,
      role: type,
      ...(organisationId && { organisationId }),
      ...(organisationUnitId && { organisationUnitId })
    });

    return this;
  }

  private async saveRole(
    user: UserEntity,
    role: {
      role: ServiceRoleEnum;
      organisationId?: string;
      organisationUnitId?: string;
    }
  ): Promise<void> {
    let dbOrganisation: OrganisationEntity | undefined;
    let dbOrganisationUnit: OrganisationUnitEntity | undefined;

    if (role.organisationId) {
      dbOrganisation = OrganisationEntity.new({ id: role.organisationId });
    }

    if (!role.organisationId && role.role === ServiceRoleEnum.INNOVATOR) {
      dbOrganisation = await this.getEntityManager().save(
        OrganisationEntity,
        OrganisationEntity.new({
          name: randCompanyName(),
          acronym: randAbbreviation(),
          isShadow: true,
          type: OrganisationTypeEnum.INNOVATOR
        })
      );
    }

    let dbOrganisationUser: OrganisationUserEntity | undefined;

    if (dbOrganisation) {
      dbOrganisationUser = await this.getEntityManager().save(
        OrganisationUserEntity,
        OrganisationUserEntity.new({
          organisation: dbOrganisation,
          user,
          role:
            role.role === ServiceRoleEnum.INNOVATOR
              ? InnovatorOrganisationRoleEnum.INNOVATOR_OWNER
              : AccessorOrganisationRoleEnum.ACCESSOR
        })
      );
    }

    if (role.organisationUnitId && dbOrganisationUser) {
      dbOrganisationUnit = OrganisationUnitEntity.new({ id: role.organisationUnitId });

      await this.getEntityManager().save(
        OrganisationUnitUserEntity,
        OrganisationUnitUserEntity.new({
          organisationUnit: dbOrganisationUnit,
          organisationUser: dbOrganisationUser
        })
      );
    }

    //save role
    await this.getEntityManager().save(
      UserRoleEntity,
      UserRoleEntity.new({
        user: user,
        role: role.role,
        ...(dbOrganisation && { organisation: dbOrganisation }),
        ...(dbOrganisationUnit && { organisationUnit: dbOrganisationUnit })
      })
    );
  }

  async save(): Promise<TestUserType> {
    const dbUser = await this.getEntityManager().getRepository(UserEntity).save(this.user);

    for (const roleToAdd of this.rolesToAdd) {
      await this.saveRole(dbUser, roleToAdd);
    }

    const result = await this.getEntityManager()
      .createQueryBuilder(UserEntity, 'user')
      .select([
        'user.id',
        'user.identityId',
        'user.status',
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

    const userRoles: {
      [key: string]: {
        id: string;
        role: ServiceRoleEnum;
        lockedAt: null | Date;
        organisation?: { id: string; name: string; acronym: null | string };
        organisationUnit?: { id: string; name: string; acronym: string };
      };
    } = {};

    this.rolesToAdd.map(r => {
      const foundRole = result.serviceRoles.find(sR => {
        if (sR.role !== r.role) {
          return false;
        }

        if (r.organisationId && sR.organisation) {
          if (r.organisationId !== sR.organisation.id) {
            return false;
          }
        }

        if (r.organisationUnitId && sR.organisationUnit) {
          if (r.organisationUnitId !== sR.organisationUnit.id) {
            return false;
          }
        }

        return true;
      });

      if (!foundRole) {
        throw new Error('userBuilder::save: Error retrieving user roles.');
      }

      userRoles[r.key] = {
        id: foundRole.id,
        role: foundRole.role,
        lockedAt: foundRole.lockedAt,
        ...(foundRole.organisation && {
          organisation: {
            id: foundRole.organisation.id,
            name: foundRole.organisation.name,
            acronym: foundRole.organisation.acronym
          }
        }),
        ...(foundRole.organisationUnit && {
          organisationUnit: {
            id: foundRole.organisationUnit.id,
            name: foundRole.organisationUnit.name,
            acronym: foundRole.organisationUnit.acronym
          }
        })
      };
    });

    const organisations: {
      [key: string]: {
        id: string;
        name: string;
        acronym: string | null;
        size: string | null;
        role: InnovatorOrganisationRoleEnum | AccessorOrganisationRoleEnum;
        isShadow: boolean;
        description: string | null;
        registrationNumber: string | null;
        organisationUnits: {
          [key: string]: {
            id: string;
            acronym: string;
            name: string;
            organisationUnitUser: { id: string };
          };
        };
      };
    } = {};

    (await result.userOrganisations).map(userOrganisation => {
      const organisation = userOrganisation.organisation;
      const organisationUnits = userOrganisation.userOrganisationUnits;
      organisations[organisation.name] = {
        id: organisation.id,
        name: organisation.name,
        acronym: organisation.acronym,
        size: organisation.size,
        role: userOrganisation.role,
        isShadow: organisation.isShadow,
        description: organisation.description,
        registrationNumber: organisation.registrationNumber,
        organisationUnits: {}
      };

      organisationUnits.map(item => {
        organisations[organisation.name]!.organisationUnits[item.organisationUnit.name] = {
          id: item.organisationUnit.id,
          acronym: item.organisationUnit.acronym,
          name: item.organisationUnit.name,
          organisationUnitUser: { id: item.id }
        };
      });
    });

    return {
      id: result.id,
      identityId: result.identityId,
      name: this.additionalFields.name ?? randFullName(),
      email: randEmail(),
      mobilePhone: this.additionalFields.mobilePhone,
      isActive: result.status === UserStatusEnum.ACTIVE,
      lockedAt: result.lockedAt,
      roles: userRoles,
      organisations: organisations
    };
  }
}
