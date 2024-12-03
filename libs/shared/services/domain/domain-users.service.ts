import type { DataSource, EntityManager } from 'typeorm';

import type { PhoneUserPreferenceEnum } from '../../enums';
import {
  InnovationArchiveReasonEnum,
  InnovationCollaboratorStatusEnum,
  NotifierTypeEnum,
  ServiceRoleEnum,
  UserStatusEnum
} from '../../enums';
import {
  GenericErrorsEnum,
  InternalServerError,
  NotFoundError,
  NotImplementedError,
  UserErrorsEnum
} from '../../errors';
import { TranslationHelper } from '../../helpers';
import type { DomainContextType, DomainUserIdentityInfo, InnovatorDomainContextType, RoleType } from '../../types';

import { InnovationEntity } from '../../entities/innovation/innovation.entity';
import { UserPreferenceEntity } from '../../entities/user/user-preference.entity';
import { roleEntity2RoleType, UserRoleEntity } from '../../entities/user/user-role.entity';
import { UserEntity } from '../../entities/user/user.entity';
import { displayName, UserMap } from '../../models/user.map';
import { AuthErrorsEnum } from '../auth/authorization-validation.model';
import type { IdentityProviderService } from '../integrations/identity-provider.service';
import type { NotifierService } from '../integrations/notifier.service';
import { SQLConnectionService } from '../storage/sql-connection.service';
import type { DomainInnovationsService } from './domain-innovations.service';

export class DomainUsersService {
  private _sqlConnection: DataSource;
  get sqlConnection(): DataSource {
    if (!this._sqlConnection) {
      this._sqlConnection = this.sqlConnectionService.getConnection();
    }
    return this._sqlConnection;
  }

  #domainInnovationService: DomainInnovationsService;
  get domainInnovationService(): DomainInnovationsService {
    return this.#domainInnovationService;
  }
  set domainInnovationService(value: DomainInnovationsService) {
    this.#domainInnovationService = value;
  }

  constructor(
    private identityProviderService: IdentityProviderService,
    private notifierService: NotifierService,
    private sqlConnectionService: SQLConnectionService
  ) {}

  /**
   * helper to display a user's name. This function doesn't return error when the user is not found/deleted
   */
  async getDisplayName(
    data: { userId: string | undefined } | { identityId: string | undefined },
    role?: ServiceRoleEnum,
    em?: EntityManager
  ): Promise<string> {
    if ('userId' in data && data.userId) {
      return displayName((await this.getUsersList({ userIds: [data.userId] }, em))[0] ?? data.userId, role);
    }
    if ('identityId' in data && data.identityId) {
      return displayName((await this.getUsersList({ identityIds: [data.identityId] }, em))[0] ?? data.identityId, role);
    }

    return displayName(undefined, role);
  }

  /**
   * wrapper for identityInfo with extra checks. This will throw an error if the user is not found
   */
  async getIdentityUserInfo(
    data: { userId: string } | { identityId: string },
    em?: EntityManager
  ): Promise<DomainUserIdentityInfo> {
    const res = await ('userId' in data
      ? this.getUsersList({ userIds: [data.userId] }, em)
      : this.getUsersList({ identityIds: [data.identityId] }, em));

    if (!res[0]) {
      throw new NotFoundError(UserErrorsEnum.USER_SQL_NOT_FOUND);
    }
    return res[0];
  }

  async getUserInfo(
    data: { userId: string } | { identityId: string } | { email: string },
    filters?: { organisations?: boolean },
    entityManager?: EntityManager,
    options?: { forceRefresh?: boolean }
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

    const user = await this.identityProviderService.getUserInfo(dbUser.identityId, options?.forceRefresh);

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

  protected async getUsersList(
    data: { userIds?: string[]; identityIds?: string[] },
    entityManager?: EntityManager
  ): Promise<DomainUserIdentityInfo[]> {
    const em = entityManager ?? this.sqlConnection.manager;

    // [TechDebt]: This function breaks with more than 2100 users (probably shouldn't happen anyway)
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

    const query = em
      .createQueryBuilder(UserEntity, 'users')
      .select(['users.id', 'users.identityId', 'users.status', 'roles.id', 'roles.role', 'roles.isActive'])
      .innerJoin('users.serviceRoles', 'roles')
      .where('users.status <> :userDeleted', { userDeleted: UserStatusEnum.DELETED });
    if (data.userIds) {
      query.andWhere('users.id IN (:...userIds)', { userIds: data.userIds });
    } else if (data.identityIds) {
      query.andWhere('users.external_id IN (:...identityIds)', { identityIds: data.identityIds });
    }

    const dbUsers = await query.getMany();
    const identityUsers = await this.identityProviderService.getUsersMap(dbUsers.map(items => items.identityId));

    return dbUsers.map(dbUser => {
      const identityUser = identityUsers.get(dbUser.identityId);
      if (!identityUser) {
        // This should never happen, but just in case.
        throw new NotFoundError(UserErrorsEnum.USER_IDENTITY_PROVIDER_NOT_FOUND, { details: { context: 'S.DU.gUL' } });
      }

      return {
        id: dbUser.id,
        identityId: dbUser.identityId,
        displayName: identityUser.displayName,
        roles: dbUser.serviceRoles.map(r => ({ id: r.id, role: r.role, isActive: r.isActive })),
        email: identityUser.email,
        mobilePhone: identityUser.mobilePhone,
        isActive: dbUser.status === UserStatusEnum.ACTIVE,
        lastLoginAt: identityUser.lastLoginAt
      };
    });
  }

  async getUsersMap(data: { userIds: string[] } | { identityIds: string[] }, em?: EntityManager): Promise<UserMap> {
    const res = await this.getUsersList(data, em);
    const resKey = 'userIds' in data ? 'id' : 'identityId';
    return new UserMap(res.map(item => [item[resKey], item]));
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
    } catch {
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

  async getDomainContextFromRole(roleId: string, activeOnly = true): Promise<DomainContextType> {
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
        'organisationUnit.acronym',
        'user.id',
        'user.identityId'
      ])
      .leftJoin('userRole.organisation', 'organisation')
      .leftJoin('userRole.organisationUnit', 'organisationUnit')
      .innerJoin('userRole.user', 'user')
      .where('userRole.id = :roleId', { roleId });

    if (activeOnly) {
      query.andWhere('userRole.isActive = 1');
    }

    const dbUserRole = await query.getOne();
    if (!dbUserRole) {
      throw new NotFoundError(UserErrorsEnum.USER_ROLE_NOT_FOUND);
    }
    const role = roleEntity2RoleType(dbUserRole);
    return this.roleTypeToDomainContext(dbUserRole.user.id, dbUserRole.user.identityId, role);
  }

  async roleTypeToDomainContext(userId: string, identityId: string, role: RoleType): Promise<DomainContextType> {
    switch (role.role) {
      case ServiceRoleEnum.INNOVATOR:
        if (!role.organisation) {
          throw new InternalServerError(UserErrorsEnum.USER_ROLE_INVALID, { details: { role: role.id } });
        }
        return {
          id: userId,
          identityId: identityId,
          organisation: {
            id: role.organisation.id,
            name: role.organisation.name,
            acronym: role.organisation.acronym
          },
          currentRole: {
            id: role.id,
            role: role.role
          }
        };
      case ServiceRoleEnum.QUALIFYING_ACCESSOR:
      case ServiceRoleEnum.ACCESSOR:
        if (!role.organisationUnit || !role.organisation) {
          throw new InternalServerError(UserErrorsEnum.USER_ROLE_INVALID, { details: { role: role.id } });
        }
        return {
          id: userId,
          identityId: identityId,
          organisation: {
            id: role.organisation.id,
            name: role.organisation.name,
            acronym: role.organisation.acronym,
            organisationUnit: {
              id: role.organisationUnit.id,
              name: role.organisationUnit.name,
              acronym: role.organisationUnit.acronym
            }
          },
          currentRole: {
            id: role.id,
            role: role.role
          }
        };

      case ServiceRoleEnum.ASSESSMENT:
        return {
          id: userId,
          identityId: identityId,
          currentRole: {
            id: role.id,
            role: role.role
          }
        };

      case ServiceRoleEnum.ADMIN:
        return {
          id: userId,
          identityId: identityId,
          currentRole: {
            id: role.id,
            role: role.role
          }
        };

      default: {
        const roleType: never = role.role;
        throw new InternalServerError(AuthErrorsEnum.AUTH_USER_TYPE_UNKNOWN, {
          details: { roleType }
        });
      }
    }
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
      default: {
        const r: never = role;
        throw new NotImplementedError(GenericErrorsEnum.NOT_IMPLEMENTED_ERROR, { details: r });
      }
    }
  }

  /**
   * Given a user id from an innovator builds the associated domain context.
   *
   * @returns the innovator domain context or null if the user isn't "valid" (e.g., not an innovator)
   */
  async getInnovatorDomainContextByRoleId(
    userId: string,
    entityManager?: EntityManager
  ): Promise<null | InnovatorDomainContextType> {
    const em = entityManager ?? this.sqlConnection.manager;

    const role = await em
      .createQueryBuilder(UserRoleEntity, 'userRole')
      .select([
        'userRole.id',
        'user.id',
        'user.identityId',
        'organisation.id',
        'organisation.name',
        'organisation.acronym'
      ])
      .innerJoin('userRole.user', 'user')
      .innerJoin('userRole.organisation', 'organisation')
      .where('user_id = :userId', { userId })
      .andWhere('role = :innovatorRole', { innovatorRole: ServiceRoleEnum.INNOVATOR })
      .getOne();

    if (!role?.organisation) {
      return null;
    }

    return {
      id: role.user.id,
      identityId: role.user.identityId,
      organisation: {
        id: role.organisation.id,
        name: role.organisation.name,
        acronym: role.organisation.acronym
      },
      currentRole: { id: role.id, role: ServiceRoleEnum.INNOVATOR }
    };
  }

  // For now this is getting tested in the callers as no spec exists yet and to keep previous tests
  async deleteUser(
    domainContext: DomainContextType,
    userId: string,
    data: { reason: string },
    entityManager?: EntityManager
  ): Promise<void> {
    const em = entityManager ?? this.sqlConnection.manager;

    const dbUser = await em
      .createQueryBuilder(UserEntity, 'user')
      .innerJoinAndSelect('user.serviceRoles', 'roles')
      .where('user.id = :userId', { userId })
      .getOne();
    if (!dbUser) {
      throw new NotFoundError(UserErrorsEnum.USER_SQL_NOT_FOUND);
    }

    const user = await this.identityProviderService.getUserInfo(dbUser.identityId);
    if (!user) {
      throw new NotFoundError(UserErrorsEnum.USER_IDENTITY_PROVIDER_NOT_FOUND);
    }

    const innovationsWithPendingTransfer: { id: string; transferExpireDate: string }[] = [];

    return em.transaction(async transaction => {
      // If user has innovator role, deals with it's innovations.
      const userInnovatorRole = dbUser.serviceRoles.find(item => item.role === ServiceRoleEnum.INNOVATOR);

      if (userInnovatorRole) {
        const dbInnovations = await this.domainInnovationService.getInnovationsByInnovatorId(
          dbUser.id,
          false,
          transaction
        );

        await this.domainInnovationService.bulkUpdateCollaboratorStatusByEmail(
          transaction,
          { id: dbUser.id, email: user.email },
          { current: InnovationCollaboratorStatusEnum.PENDING, next: InnovationCollaboratorStatusEnum.DECLINED }
        );
        await this.domainInnovationService.bulkUpdateCollaboratorStatusByEmail(
          transaction,
          { id: dbUser.id, email: user.email },
          { current: InnovationCollaboratorStatusEnum.ACTIVE, next: InnovationCollaboratorStatusEnum.LEFT }
        );

        const archiveResponse = await this.domainInnovationService.archiveInnovationsWithDeleteSideffects(
          domainContext,
          dbInnovations
            .filter(i => i.expirationTransferDate === null)
            .map(i => ({ id: i.id, reason: InnovationArchiveReasonEnum.OWNER_ACCOUNT_DELETED })),
          transaction
        );

        for (const dbInnovation of dbInnovations.filter(i => i.expirationTransferDate !== null)) {
          innovationsWithPendingTransfer.push({
            id: dbInnovation.id,
            transferExpireDate: dbInnovation.expirationTransferDate
              ? dbInnovation.expirationTransferDate.toDateString()
              : ''
          });

          await transaction
            .getRepository(InnovationEntity)
            .update(
              { id: dbInnovation.id },
              { updatedBy: dbUser.id, owner: null, expires_at: dbInnovation.expirationTransferDate }
            );
        }

        // Send notification to collaborators if there are innovations with pending transfer
        await this.notifierService.send(domainContext, NotifierTypeEnum.ACCOUNT_DELETION, {
          innovations: [
            ...innovationsWithPendingTransfer,
            ...archiveResponse.map(item => ({
              id: item.id,
              affectedUsers: item.affectedUsers.filter(user => user.userType === ServiceRoleEnum.INNOVATOR)
            }))
          ]
        });
      }

      await transaction.update(UserRoleEntity, { user: { id: dbUser.id } }, { isActive: false });

      await transaction.update(
        UserEntity,
        { id: dbUser.id },
        { deleteReason: data.reason, status: UserStatusEnum.DELETED }
      );

      // If all went well, deleted from B2C.
      await this.identityProviderService.deleteUser(dbUser.identityId);
    });
  }

  async getUserIdentityId(id: string): Promise<string> {
    const user = await this.sqlConnection
      .createQueryBuilder(UserEntity, 'user')
      .select('user.identityId')
      .where('id = :id', { id })
      .andWhere('status <> :userDeleted', { userDeleted: UserStatusEnum.DELETED })
      .getOne();

    if (!user) {
      throw new NotFoundError(UserErrorsEnum.USER_SQL_NOT_FOUND);
    }

    return user.identityId;
  }

  private async getUserIdentityIdByEmail(email: string): Promise<string> {
    const user = await this.identityProviderService.getUserInfoByEmail(email);
    if (!user) {
      throw new NotFoundError(UserErrorsEnum.USER_IDENTITY_PROVIDER_NOT_FOUND);
    }
    return user.identityId;
  }
}
