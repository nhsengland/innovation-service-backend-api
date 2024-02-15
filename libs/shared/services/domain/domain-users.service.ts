import type { DataSource, EntityManager, Repository } from 'typeorm';

import { PhoneUserPreferenceEnum, ServiceRoleEnum, UserStatusEnum } from '../../enums';
import {
  GenericErrorsEnum,
  InternalServerError,
  NotFoundError,
  NotImplementedError,
  UserErrorsEnum
} from '../../errors';
import { TranslationHelper } from '../../helpers';
import type { RoleType } from '../../types';

import { UserPreferenceEntity } from '../../entities/user/user-preference.entity';
import { UserRoleEntity, roleEntity2RoleType } from '../../entities/user/user-role.entity';
import { UserEntity } from '../../entities/user/user.entity';
import type { IdentityProviderService } from '../integrations/identity-provider.service';

export class DomainUsersService {
  private userRepository: Repository<UserEntity>;

  constructor(
    private sqlConnection: DataSource,
    private identityProviderService: IdentityProviderService
  ) {
    this.userRepository = this.sqlConnection.getRepository(UserEntity);
  }

  async getUserInfo(
    data: { userId: string } | { identityId: string } | { email: string },
    filters?: { organisations?: boolean },
    entityManager?: EntityManager
  ): Promise<{
    id: string;
    identityId: string;
    email: string;
    displayName: string;
    roles: RoleType[];
    phone: null | string;
    isActive: boolean;
    lockedAt: null | Date;
    passwordResetAt: null | Date;
    firstTimeSignInAt: null | Date;
    organisations?: {
      id: string;
      name: string;
      acronym: null | string;
      isShadow: boolean;
      size: null | string;
      description: null | string;
      registrationNumber: null | string;
      organisationUnits: {
        id: string;
        name: string;
        acronym: string;
      }[];
    }[];
  }> {
    const em = entityManager ?? this.sqlConnection.manager;

    // The returning data for organisations/units will be reviewed later, doubling the joins at the moment though to keep current interface
    const query = em
      .createQueryBuilder(UserEntity, 'user')
      .select([
        'user.id',
        'user.identityId',
        'user.lockedAt',
        'user.status',
        'user.firstTimeSignInAt',
        // Service roles
        'serviceRoles.id',
        'serviceRoles.role',
        'serviceRoles.isActive',
        'roleOrganisation.id',
        'roleOrganisation.name',
        'roleOrganisation.acronym',
        'roleOrganisationUnit.id',
        'roleOrganisationUnit.name',
        'roleOrganisationUnit.acronym'
      ])
      .innerJoin('user.serviceRoles', 'serviceRoles')
      .leftJoin('serviceRoles.organisation', 'roleOrganisation')
      .leftJoin('serviceRoles.organisationUnit', 'roleOrganisationUnit')
      .where('user.status <> :userDeleted', { userDeleted: UserStatusEnum.DELETED });

    if (filters?.organisations) {
      query.addSelect([
        'roleOrganisation.size',
        'roleOrganisation.isShadow',
        'roleOrganisation.description',
        'roleOrganisation.registrationNumber'
      ]);
    }

    if ('userId' in data) {
      query.andWhere('user.id = :userId', { userId: data.userId });
    } else if ('identityId' in data) {
      query.andWhere('user.external_id = :identityId', { identityId: data.identityId });
    } else if ('email' in data) {
      const userIdentityId = await this.getUserIdentityIdByEmail(data.email);
      query.andWhere('user.external_id = :identityId', { identityId: userIdentityId });
    }

    const dbUser = await query.getOne();
    if (!dbUser) {
      throw new NotFoundError(UserErrorsEnum.USER_SQL_NOT_FOUND);
    }

    const organisationsMap: Map<
      string,
      {
        id: string;
        name: string;
        acronym: null | string;
        isShadow: boolean;
        size: null | string;
        description: null | string;
        registrationNumber: null | string;
        organisationUnits: {
          id: string;
          name: string;
          acronym: string;
        }[];
      }
    > = new Map();

    if (filters?.organisations) {
      dbUser.serviceRoles.forEach(userRole => {
        if (userRole.organisation) {
          if (!organisationsMap.has(userRole.organisationId)) {
            organisationsMap.set(userRole.organisationId, {
              id: userRole.organisation.id,
              name: userRole.organisation.name,
              acronym: userRole.organisation.acronym,
              isShadow: userRole.organisation.isShadow,
              description: userRole.organisation.description,
              registrationNumber: userRole.organisation.registrationNumber,
              size: userRole.organisation.size,
              organisationUnits: []
            });
          }
          if (userRole.organisationUnit) {
            organisationsMap.get(userRole.organisationId)!.organisationUnits.push({
              id: userRole.organisationUnit.id,
              name: userRole.organisationUnit.name,
              acronym: userRole.organisationUnit.acronym
            });
          }
        }
      });
    }

    const user = await this.identityProviderService.getUserInfo(dbUser.identityId);

    return {
      id: dbUser.id,
      identityId: user.identityId,
      email: user.email,
      displayName: user.displayName,
      roles: dbUser.serviceRoles.map(roleEntity2RoleType),
      phone: user.mobilePhone,
      isActive: dbUser.status === UserStatusEnum.ACTIVE,
      lockedAt: dbUser.lockedAt,
      passwordResetAt: user.passwordResetAt,
      firstTimeSignInAt: dbUser.firstTimeSignInAt,
      ...(filters?.organisations && { organisations: [...organisationsMap.values()] })
    };
  }

  async getUsersList(data: { userIds?: string[]; identityIds?: string[] }): Promise<
    {
      id: string;
      identityId: string;
      displayName: string;
      roles: UserRoleEntity[];
      email: string;
      mobilePhone: null | string;
      isActive: boolean;
      lastLoginAt: null | Date;
    }[]
  > {
    // [TechDebt]: This function breaks with more than 2100 users (probably shoulnd't happen anyway)
    // However we're doing needless query since we could force the identityId (only place calling it has it)
    // and it would also be easy to do in chunks of 1000 users or so.
    // My suggestion is parameter becomes identity: string[]; if there really is a need in the future to have
    // both parameters we could add a function that does that part and calls this one

    if (!data.userIds && !data.identityIds) {
      throw new InternalServerError(UserErrorsEnum.USER_INFO_EMPTY_INPUT);
    }

    // If provided information is empty, nothing to do here!
    if ((data.userIds && data.userIds.length === 0) || (data.identityIds && data.identityIds.length === 0)) {
      return [];
    }

    const query = this.userRepository
      .createQueryBuilder('users')
      .innerJoinAndSelect('users.serviceRoles', 'serviceRoles')
      .where('users.status <> :userDeleted', { userDeleted: UserStatusEnum.DELETED });
    if (data.userIds) {
      query.andWhere('users.id IN (:...userIds)', { userIds: data.userIds });
    } else if (data.identityIds) {
      query.andWhere('users.external_id IN (:...identityIds)', { identityIds: data.identityIds });
    }

    const dbUsers = await query.getMany();
    const identityUsers = await this.identityProviderService.getUsersList(dbUsers.map(items => items.identityId));

    return dbUsers.map(dbUser => {
      const identityUser = identityUsers.find(item => item.identityId === dbUser.identityId);
      if (!identityUser) {
        throw new NotFoundError(UserErrorsEnum.USER_IDENTITY_PROVIDER_NOT_FOUND, { details: { context: 'S.DU.gUL' } });
      }

      return {
        id: dbUser.id,
        identityId: dbUser.identityId,
        displayName: identityUser.displayName,
        roles: dbUser.serviceRoles,
        email: identityUser.email,
        mobilePhone: identityUser.mobilePhone,
        isActive: dbUser.status === UserStatusEnum.ACTIVE,
        lastLoginAt: identityUser.lastLoginAt
      };
    });
  }

  async getUsersMap(
    data: { userIds: string[] } | { identityIds: string[] }
  ): Promise<Map<string, Awaited<ReturnType<DomainUsersService['getUsersList']>>[number]>> {
    const res = await this.getUsersList(data);
    const resKey = 'userIds' in data ? 'id' : 'identityId';
    return new Map(res.map(item => [item[resKey], item]));
  }

  async getUserPreferences(userId: string): Promise<{
    contactByPhone: boolean;
    contactByEmail: boolean;
    contactByPhoneTimeframe: null | PhoneUserPreferenceEnum;
    contactDetails: null | string;
  }> {
    const userPreferences = await this.sqlConnection
      .createQueryBuilder(UserPreferenceEntity, 'preference')
      .where('preference.user = :userId', { userId: userId })
      .getOne();

    return {
      contactByPhone: userPreferences?.contactByPhone ?? false,
      contactByEmail: userPreferences?.contactByEmail ?? false,
      contactByPhoneTimeframe: userPreferences?.contactByPhoneTimeframe ?? null,
      contactDetails: userPreferences?.contactDetails ?? null
    };
  }

  /**
   * returns a user based on email
   * @param email the email to search
   * @param filters
   *  - userRoles: the user roles to filter by.
   * @returns the user as an array.
   */
  async getUserByEmail(
    email: string,
    filters?: { userRoles: ServiceRoleEnum[] }
  ): Promise<Awaited<ReturnType<DomainUsersService['getUserInfo']>>[]> {
    try {
      const authUser = await this.identityProviderService.getUserInfoByEmail(email);
      if (!authUser) {
        throw new NotFoundError(UserErrorsEnum.USER_IDENTITY_PROVIDER_NOT_FOUND);
      }

      const dbUser = await this.getUserInfo({ identityId: authUser.identityId });
      if (filters) {
        // Apply filters.
        if (
          filters.userRoles.length === 0 ||
          (filters.userRoles.length > 0 &&
            filters.userRoles.some(userRole => dbUser.roles.map(r => r.role).includes(userRole)))
        ) {
          return [dbUser];
        } else {
          throw new NotFoundError(UserErrorsEnum.USER_SQL_NOT_FOUND);
        }
      } else {
        return [dbUser];
      }
    } catch (error) {
      // As this method mimics a search, on errors, we just return an empty array.
      return [];
    }
  }

  async getUserRoles(userId: string): Promise<RoleType[]> {
    const dbRoles = await this.sqlConnection
      .createQueryBuilder(UserRoleEntity, 'userRole')
      .leftJoinAndSelect('userRole.organisationUnit', 'unit')
      .leftJoinAndSelect('unit.organisation', 'organisation')
      .innerJoinAndSelect('userRole.user', 'user')
      .where('user.id = :userId', { userId })
      .getMany();

    const roles: RoleType[] = [];

    dbRoles.forEach(role => roles.push(roleEntity2RoleType(role)));

    return roles;
  }

  /**
   * given a user and role retrieves the full role type
   * @param userId the user id
   * @param roleId the role id
   * @param activeOnly whether to only return active roles (defaults to true)
   * @returns the full role type for the user if found, null otherwise
   */
  async getUserRole(userId: string, roleId?: string, activeOnly = true): Promise<RoleType | null> {
    const query = this.sqlConnection
      .createQueryBuilder(UserRoleEntity, 'userRole')
      .select([
        'userRole.id',
        'userRole.role',
        'userRole.isActive',
        'organisation.id',
        'organisation.name',
        'organisation.acronym',
        'organisationUnit.id',
        'organisationUnit.name',
        'organisationUnit.acronym'
      ])
      .leftJoin('userRole.organisation', 'organisation')
      .leftJoin('userRole.organisationUnit', 'organisationUnit')
      .where('userRole.user = :userId', { userId });

    if (activeOnly) {
      query.andWhere('userRole.isActive = 1');
    }

    // currently we're returning the first role found when no roleId (related to TechDebt in v1-me-info) and this is to
    // keep current behavior. We shouldn't be calling this without roleId in the future.
    if (roleId) {
      query.andWhere('userRole.id = :roleId', { roleId });
    }

    const dbUserRole = await query.getOne();

    return dbUserRole ? roleEntity2RoleType(dbUserRole) : null;
  }

  // try to deprecate
  getDisplayRoleInformation(userId: string, role: ServiceRoleEnum, innovationOwnerId?: string): string | undefined {
    if (role !== ServiceRoleEnum.INNOVATOR) {
      return TranslationHelper.translate(`SERVICE_ROLES.${role}`);
    }

    if (innovationOwnerId) {
      return userId === innovationOwnerId ? 'Owner' : 'Collaborator';
    }

    return;
  }

  // try to deprecate
  getDisplayTeamInformation(role: ServiceRoleEnum, unitName?: string): string | undefined {
    if (role === ServiceRoleEnum.ACCESSOR || role === ServiceRoleEnum.QUALIFYING_ACCESSOR) {
      return unitName;
    }

    if (role === ServiceRoleEnum.ASSESSMENT || role === ServiceRoleEnum.ADMIN) {
      return TranslationHelper.translate(`TEAMS.${role}`);
    }

    return;
  }

  // in the future improve this with other "template" requirements, but keep it a standard
  // this function is supposed to be the standard display of additional info for the users and should
  // adjust the output according to the data passed, the invoker controls what's shown by passing the data
  // but the same data will always produce the same output
  getDisplayTag(role: ServiceRoleEnum, data: { unitName?: string | null; isOwner?: boolean }): string {
    switch (role) {
      case ServiceRoleEnum.ACCESSOR:
      case ServiceRoleEnum.QUALIFYING_ACCESSOR:
        return data.unitName ?? '';
      case ServiceRoleEnum.ASSESSMENT:
      case ServiceRoleEnum.ADMIN:
        return TranslationHelper.translate(`TEAMS.${role}`);
      case ServiceRoleEnum.INNOVATOR:
        return data.isOwner === undefined ? 'Innovator' : data.isOwner ? 'Owner' : 'Collaborator';
      default:
        const r: never = role;
        throw new NotImplementedError(GenericErrorsEnum.NOT_IMPLEMENTED_ERROR, { details: r });
    }
  }

  private async getUserIdentityIdByEmail(email: string): Promise<string> {
    const user = await this.identityProviderService.getUserInfoByEmail(email);
    if (!user) {
      throw new NotFoundError(UserErrorsEnum.USER_IDENTITY_PROVIDER_NOT_FOUND);
    }
    return user.identityId;
  }
}
