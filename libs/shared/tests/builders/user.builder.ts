/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { randAbbreviation, randCompanyName, randEmail, randFullName, randPastDate, randUuid } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';

import { OrganisationUnitUserEntity } from '../../entities';
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

import { groupBy } from 'lodash';
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
  roles: Record<string, RoleType>;
  organisations: Record<string, TestUserOrganisationsType>;
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
      serviceRoles: [],
      status: UserStatusEnum.ACTIVE
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

  setStatus(status: UserStatusEnum): this {
    this.user.status = status;
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

  private async saveRoles(
    user: UserEntity,
    roles: {
      role: ServiceRoleEnum;
      organisationId?: string;
      organisationUnitId?: string;
    }[]
  ): Promise<void> {
    const rolesPerOrg = groupBy(roles, 'organisationId');

    for (const [orgId, values] of Object.entries(rolesPerOrg)) {
      let dbOrganisationId: string | undefined = orgId !== 'undefined' ? orgId : undefined;
      let dbOrganisationUserId: string | undefined;

      // Create the innovator organisation if one was not given
      const isInnovator = values.some(v => v.role === ServiceRoleEnum.INNOVATOR);

      // sanity check
      if (isInnovator && (values.some(v => v.role !== ServiceRoleEnum.INNOVATOR) || values.length > 1)) {
        throw new Error("UserBuilder::saveRoles: Innovator can't have other roles nor multiple roles");
      }

      // create innovator organisation
      if (!dbOrganisationId && isInnovator) {
        dbOrganisationId = (
          await this.getEntityManager().save(OrganisationEntity, {
            name: randCompanyName(),
            acronym: randAbbreviation(),
            isShadow: true,
            type: OrganisationTypeEnum.INNOVATOR
          })
        ).id;
      }

      // Create the organisation user
      if (dbOrganisationId) {
        dbOrganisationUserId = (
          await this.getEntityManager().save(OrganisationUserEntity, {
            organisation: { id: dbOrganisationId },
            user,
            role: isInnovator
              ? InnovatorOrganisationRoleEnum.INNOVATOR_OWNER
              : values.some(v => v.role === ServiceRoleEnum.QUALIFYING_ACCESSOR)
              ? AccessorOrganisationRoleEnum.QUALIFYING_ACCESSOR
              : AccessorOrganisationRoleEnum.ACCESSOR
          })
        ).id;
      }

      for (const role of values) {
        // Create the organisation unit user
        if (role.organisationUnitId && dbOrganisationUserId) {
          await this.getEntityManager().save(OrganisationUnitUserEntity, {
            organisationUnit: { id: role.organisationUnitId },
            organisationUser: { id: dbOrganisationUserId }
          });
        }

        //save role
        await this.getEntityManager().save(UserRoleEntity, {
          user: user,
          role: role.role,
          ...(dbOrganisationId && { organisation: { id: dbOrganisationId } }), // not using role because of innovator auto create
          ...(role.organisationUnitId && { organisationUnit: { id: role.organisationUnitId } })
        });
      }
    }
  }

  async save(): Promise<TestUserType> {
    const dbUser = await this.getEntityManager().getRepository(UserEntity).save(this.user);

    await this.saveRoles(dbUser, this.rolesToAdd);

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
        'roles.isActive',
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
        isActive: boolean;
        organisation?: { id: string; name: string; acronym: null | string };
        organisationUnit?: { id: string; name: string; acronym: string };
      };
    } = {};

    this.rolesToAdd.forEach(r => {
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
        isActive: foundRole.isActive,
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
