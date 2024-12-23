import { inject, injectable } from 'inversify';
import Joi from 'joi';
import type { EntityManager } from 'typeorm';

import {
  InnovationAssessmentEntity,
  OrganisationEntity,
  OrganisationUnitEntity,
  UserEntity,
  UserRoleEntity
} from '@admin/shared/entities';
import { NotifierTypeEnum, ServiceRoleEnum, UserStatusEnum } from '@admin/shared/enums';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  GenericErrorsEnum,
  NotFoundError,
  NotImplementedError,
  OrganisationErrorsEnum,
  UnprocessableEntityError,
  UserErrorsEnum
} from '@admin/shared/errors';
import {
  CacheConfigType,
  CacheService,
  DomainService,
  IdentityProviderService,
  NotifierService
} from '@admin/shared/services';
import {
  isAdminDomainContextType,
  type CreateRolesType,
  type DomainContextType,
  type RoleType
} from '@admin/shared/types';

import { JoiHelper } from '@admin/shared/helpers';
import SHARED_SYMBOLS from '@admin/shared/services/symbols';
import { AdminOperationEnum, validationsHelper } from '../_config/admin-operations.config';
import type { ValidationResult } from '../types/validation.types';
import { BaseService } from './base.service';

@injectable()
export class UsersService extends BaseService {
  private cache: CacheConfigType['IdentityUserInfo'];

  constructor(
    @inject(SHARED_SYMBOLS.CacheService) cacheService: CacheService,
    @inject(SHARED_SYMBOLS.IdentityProviderService) private identityProviderService: IdentityProviderService,
    @inject(SHARED_SYMBOLS.NotifierService) private notifierService: NotifierService,
    @inject(SHARED_SYMBOLS.DomainService) private domainService: DomainService
  ) {
    super();
    this.cache = cacheService.get('IdentityUserInfo');
  }

  /**
   * updates a user info in the database and in the identity provider if needed
   * @param userId the user id
   * @param data partial user update options)
   *   - accountEnabled: enable or disable the user
   *   - role: change the user role
   */
  async updateUser(
    context: DomainContextType,
    userId: string,
    data: {
      accountEnabled?: boolean;
      role?: { name: ServiceRoleEnum.ACCESSOR | ServiceRoleEnum.QUALIFYING_ACCESSOR; organisationId: string };
      email?: string;
    },
    entityManager?: EntityManager
  ): Promise<{ id: string }> {
    const sqlConnection = entityManager ?? this.sqlConnection.manager;

    const dbUserQuery = sqlConnection
      .createQueryBuilder(UserEntity, 'user')
      .select(['user.id', 'user.identityId'])
      .innerJoin('user.serviceRoles', 'userRoles')
      .leftJoin('userRoles.organisation', 'organisation')
      .where('user.id = :userId', { userId });

    if (data.role?.organisationId) {
      dbUserQuery.andWhere('organisation.id = :organisationId', { organisationId: data.role.organisationId });
    }

    const dbUser = await dbUserQuery.getOne();

    if (!dbUser) {
      throw new NotFoundError(UserErrorsEnum.USER_SQL_NOT_FOUND);
    }

    return await sqlConnection.transaction(async transaction => {
      if (data.accountEnabled != undefined) {
        await transaction.update(
          UserEntity,
          { id: userId },
          {
            lockedAt: data.accountEnabled === false ? new Date().toISOString() : null,
            status: data.accountEnabled === false ? UserStatusEnum.LOCKED : UserStatusEnum.ACTIVE
          }
        );

        // if user is locked then lock all user roles
        if (data.accountEnabled === false) {
          await transaction.update(UserRoleEntity, { user: { id: dbUser.id } }, { isActive: false });
        }

        await this.identityProviderService.updateUserAsync(dbUser.identityId, {
          accountEnabled: data.accountEnabled
        });
      }

      if (data.role) {
        await transaction.update(
          UserRoleEntity,
          { user: { id: userId }, organisation: { id: data.role.organisationId } },
          { role: data.role.name }
        );
      }

      // Send notification to locked user.
      if (data.accountEnabled != undefined && !data.accountEnabled) {
        await this.notifierService.send(context, NotifierTypeEnum.LOCK_USER, {
          identityId: dbUser.identityId
        });
      }

      if (data.email) {
        const userInfo = await this.identityProviderService.getUserInfo(dbUser.identityId);
        await this.identityProviderService.updateUserEmail(dbUser.identityId, data.email);
        await this.notifierService.send(context, NotifierTypeEnum.USER_EMAIL_ADDRESS_UPDATED, {
          identityId: dbUser.identityId,
          oldEmail: userInfo.email,
          newEmail: data.email
        });
      }

      // Remove cache entry.
      await this.cache.delete(dbUser.identityId);

      return { id: userId };
    });
  }

  async createUser(
    domainContext: DomainContextType,
    data: {
      name: string;
      email: string;
    } & CreateRolesType,
    entityManager?: EntityManager
  ): Promise<{ id: string }> {
    const em = entityManager ?? this.sqlConnection.manager;

    // pre validations for "accessors" roles (avoid creating b2c users if invalid data)
    if (data.role === ServiceRoleEnum.ACCESSOR || data.role === ServiceRoleEnum.QUALIFYING_ACCESSOR) {
      if (!data.unitIds.length) {
        throw new BadRequestError(UserErrorsEnum.USER_INVALID_ACCESSOR_PARAMETERS);
      }
      // validate units in org
      const dbUnits = new Set(
        (
          await em
            .createQueryBuilder(OrganisationUnitEntity, 'unit')
            .select(['unit.id'])
            .where('unit.organisation_id = :orgId', { orgId: data.organisationId })
            .getMany()
        ).map(u => u.id)
      );
      if (data.unitIds.some(id => !dbUnits.has(id))) {
        throw new NotFoundError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND, {
          details: { unitIds: data.unitIds }
        });
      }
    }

    let identityId: string;

    data.email = data.email.toLowerCase();
    const password = Math.random().toString(36).slice(2) + '0aA!';

    const b2cUser = await this.identityProviderService.getUserInfoByEmail(data.email);

    if (b2cUser) {
      identityId = b2cUser.identityId;
      // user exists in b2c, check if it also exists in DB
      const user = await em
        .createQueryBuilder(UserEntity, 'user')
        .where('user.identityId = :identityId', { identityId: b2cUser.identityId })
        .getOne();

      if (user) {
        throw new UnprocessableEntityError(UserErrorsEnum.USER_ALREADY_EXISTS);
      }
    } else {
      // b2c user doesn't exist, create it
      const iId = await this.identityProviderService.createUser({
        name: data.name,
        email: data.email,
        password: password
      });

      identityId = iId;
    }

    return await em.transaction(async transaction => {
      const user = await transaction.save(
        UserEntity,
        UserEntity.new({
          identityId: identityId,
          createdBy: domainContext.id,
          updatedBy: domainContext.id
        })
      );

      for (const role of this.createRolesType2Db(data)) {
        await this.addDbRole(domainContext, user.id, role, transaction);
      }

      // Send notification to new account
      if (data.email && user) {
        await this.notifierService.send(domainContext, NotifierTypeEnum.NEW_SUPPORTING_ACCOUNT, {
          recipientEmail: data.email
        });
      }

      return { id: user.id };
    });
  }

  async deleteUser(domainContext: DomainContextType, userId: string, entityManager?: EntityManager): Promise<void> {
    // This shouldn't be here but adding anyway as a failsafe since this is a destructive operation
    if (!isAdminDomainContextType(domainContext)) {
      throw new ForbiddenError(GenericErrorsEnum.FORBIDDEN_ERROR);
    }

    const validations = await validationsHelper(AdminOperationEnum.DELETE_USER, { userId });
    if (validations.find(v => v.valid === false)) {
      throw new BadRequestError(UserErrorsEnum.USER_CANNOT_BE_DELETED, { details: { validations } });
    }

    await this.domainService.users.deleteUser(
      domainContext,
      userId,
      { reason: 'User deleted by admin' },
      entityManager
    );
  }

  async getUserInfo(
    idOrEmail: string,
    entityManager?: EntityManager
  ): Promise<{
    id: string;
    email: string;
    name: string;
    phone?: string;
    isActive: boolean;
    roles: (RoleType & {
      displayTeam?: string;
    })[];
  }> {
    const em = entityManager ?? this.sqlConnection.manager;
    const identifier = this.isUuid(idOrEmail) ? { userId: idOrEmail } : { email: idOrEmail };
    const user = await this.domainService.users.getUserInfo(identifier, {}, em);

    return {
      id: user.id,
      email: user.email,
      name: user.displayName,
      isActive: user.isActive,
      phone: user.phone ?? undefined,
      roles: user.roles.map(r => ({
        ...r,
        displayTeam: this.domainService.users.getDisplayTeamInformation(r.role, r.organisationUnit?.name)
      }))
    };
  }

  async addRoles(
    domainContext: DomainContextType,
    userId: string,
    data: CreateRolesType,
    entityManager?: EntityManager
  ): Promise<{ id: string }[]> {
    const validations: ValidationResult[] = [];

    validations.push(
      ...(await validationsHelper(AdminOperationEnum.ADD_USER_ROLE, {
        userId,
        role: data.role,
        ...('unitIds' in data && { organisationUnitIds: data.unitIds })
      }))
    );

    if (validations.some(v => v.valid === false)) {
      throw new BadRequestError(GenericErrorsEnum.INVALID_PAYLOAD, { details: { validations } });
    }

    const em = entityManager ?? this.sqlConnection.manager;
    return em.transaction(async transaction => {
      const roles = [];
      for (const role of this.createRolesType2Db(data)) {
        const roleId = await this.addDbRole(domainContext, userId, role, transaction);
        roles.push(roleId);
      }
      return roles;
    });
  }

  /**
   * update the user role
   * @param domainContext the context of who is making the request
   * @param roleId the roleId being updated
   * @param data the data to update, all optional
   *   - enabled: enable or disable the role
   * @param entityManager optional entity manager to use for the transaction
   */
  async updateUserRole(
    domainContext: DomainContextType,
    userId: string,
    roleId: string,
    data: { enabled?: boolean },
    entityManager?: EntityManager
  ): Promise<void> {
    // Force a transaction to exist so that all is done in a single transaction
    if (!entityManager) {
      return this.sqlConnection.transaction(transaction => {
        return this.updateUserRole(domainContext, userId, roleId, data, transaction);
      });
    }
    if (data.enabled !== undefined) {
      await (data.enabled
        ? this.enableRole(domainContext, userId, roleId, entityManager)
        : this.disableRole(domainContext, userId, roleId, entityManager));
    }
  }

  /**
   * disables a user role and the user if it was the last role
   * @param domainContext
   * @param roleId
   * @param transaction
   */
  async disableRole(
    domainContext: DomainContextType,
    userId: string,
    roleId: string,
    transaction: EntityManager
  ): Promise<void> {
    await transaction.update(UserRoleEntity, { id: roleId }, { isActive: false, updatedBy: domainContext.id });

    const role = await transaction
      .createQueryBuilder(UserRoleEntity, 'role')
      .select(['role.id'])
      .where('role.user_id = :userId', { userId })
      .andWhere('role.isActive = :isActive', { isActive: true })
      .getOne();

    // if there's not active role disable the user
    if (!role) {
      await this.updateUser(domainContext, userId, { accountEnabled: false }, transaction);
    }
  }

  /**
   * enables a user role and the user if it was locked
   * @param domainContext the context of who is making the request
   * @param roleId the roleId being updated
   * @param transaction the transaction entity manager to use
   */
  async enableRole(
    domainContext: DomainContextType,
    userId: string,
    roleId: string,
    transaction: EntityManager
  ): Promise<void> {
    await transaction.update(UserRoleEntity, { id: roleId }, { isActive: true, updatedBy: domainContext.id });

    const user = await transaction
      .createQueryBuilder(UserEntity, 'user')
      .select(['user.id'])
      .where('user.id = :userId', { userId })
      .andWhere('user.status = :status', { status: UserStatusEnum.LOCKED })
      .getOne();

    if (user) {
      await this.updateUser(domainContext, user.id, { accountEnabled: true }, transaction);
    }
  }

  /**
   * TODO: transform into private and adapt the unit tests to use the addRoles as entrypoint
   * This is a dumb method, it just creates roles from the given data, validations MUST be done before
   * ADMIN and ASSESSMENT -> Just role
   * ACCESSOR and QUALIFYING ACCESSOR -> Role, OrgUser, OrgUnitUser
   */
  async addDbRole(
    domainContext: DomainContextType,
    userId: string,
    data:
      | { role: ServiceRoleEnum.ACCESSOR | ServiceRoleEnum.QUALIFYING_ACCESSOR; orgId: string; unitId: string }
      | { role: ServiceRoleEnum.ADMIN | ServiceRoleEnum.ASSESSMENT },
    transaction: EntityManager
  ): Promise<{ id: string }> {
    let role: UserRoleEntity;

    switch (data.role) {
      case ServiceRoleEnum.ADMIN:
      case ServiceRoleEnum.ASSESSMENT:
        role = await transaction.save(
          UserRoleEntity,
          UserRoleEntity.new({
            user: UserEntity.new({ id: userId }),
            role: data.role,
            isActive: true,
            createdBy: domainContext.id,
            updatedBy: domainContext.id
          })
        );
        break;
      case ServiceRoleEnum.ACCESSOR:
      case ServiceRoleEnum.QUALIFYING_ACCESSOR: {
        const unit = await transaction
          .createQueryBuilder(OrganisationUnitEntity, 'unit')
          .select(['unit.id', 'unit.inactivatedAt'])
          .where('unit.id = :unitId', { unitId: data.unitId })
          .andWhere('unit.organisation_id = :organisationId', { organisationId: data.orgId }) // ensure that the unit belongs to the organisation
          .getOne();
        if (!unit) {
          throw new NotFoundError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND);
        }

        role = await transaction.save(
          UserRoleEntity,
          UserRoleEntity.new({
            user: UserEntity.new({ id: userId }),
            role: data.role,
            organisation: OrganisationEntity.new({ id: data.orgId }),
            organisationUnit: unit,
            createdBy: domainContext.id,
            updatedBy: domainContext.id,
            isActive: !unit.inactivatedAt
          })
        );
        break;
      }
      default:
        throw new NotImplementedError(GenericErrorsEnum.NOT_IMPLEMENTED_ERROR);
    }

    return { id: role.id };
  }

  async getUserMfaInfo(id: string): ReturnType<IdentityProviderService['getMfaInfo']> {
    const identityId = await this.domainService.users.getUserIdentityId(id);
    return this.identityProviderService.getMfaInfo(identityId);
  }

  async upsertUserMfa(id: string, data: Parameters<IdentityProviderService['upsertUserMfa']>[1]): Promise<void> {
    const identityId = await this.domainService.users.getUserIdentityId(id);
    return this.identityProviderService.upsertUserMfa(identityId, data);
  }

  async getAssignedInnovations(
    userId: string,
    entityManager?: EntityManager
  ): Promise<{
    count: number;
    data: {
      innovation: { id: string; name: string };
      supportedBy: { id: string; name: string; role: ServiceRoleEnum }[];
      unit: string;
    }[];
  }> {
    const em = entityManager ?? this.sqlConnection.manager;

    const user = await em
      .createQueryBuilder(UserEntity, 'user')
      .select(['role.id', 'role.role', 'user.id', 'user.identityId'])
      .innerJoin('user.serviceRoles', 'role')
      .where('user.id = :userId', { userId })
      .getOne();
    if (
      !user ||
      (user && user.serviceRoles.some(r => [ServiceRoleEnum.INNOVATOR, ServiceRoleEnum.ADMIN].includes(r.role)))
    ) {
      throw new ConflictError(UserErrorsEnum.USER_ROLE_NOT_ALLOWED);
    }
    const userIdsSet = new Set<string>([user.identityId]);

    let roleAndSupports: UserRoleEntity[] = [];
    if (user.serviceRoles.some(r => [ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR].includes(r.role))) {
      roleAndSupports = await em
        .createQueryBuilder(UserRoleEntity, 'role')
        .select([
          'role.id',
          'role.role',
          'support.id',
          'unit.name',
          'innovation.id',
          'innovation.name',
          'assignedUserRole.id',
          'assignedUserRole.role',
          'assignedUser.id',
          'assignedUser.identityId'
        ])
        .innerJoin('role.organisationUnit', 'unit')
        .leftJoin('role.innovationSupports', 'support')
        .innerJoin('support.innovation', 'innovation')
        .innerJoin('support.userRoles', 'assignedUserRole')
        .innerJoin('assignedUserRole.user', 'assignedUser')
        .where('role.user_id = :userId', { userId })
        .andWhere('role.role IN (:...accessorRoles)', {
          accessorRoles: [ServiceRoleEnum.QUALIFYING_ACCESSOR, ServiceRoleEnum.ACCESSOR]
        })
        .getMany();
    }

    const data: Awaited<ReturnType<UsersService['getAssignedInnovations']>>['data'] = [];

    roleAndSupports.forEach(r =>
      r.innovationSupports.forEach(s => s.userRoles.forEach(r => userIdsSet.add(r.user.identityId)))
    );

    const usersInfoMap = await this.domainService.users.getUsersMap({ identityIds: Array.from(userIdsSet) }, em);

    for (const role of roleAndSupports) {
      for (const support of role.innovationSupports) {
        data.push({
          innovation: { id: support.innovation.id, name: support.innovation.name },
          supportedBy: support.userRoles.map(r => ({
            id: r.user.id,
            name: usersInfoMap.getDisplayName(r.user.identityId),
            role: r.role
          })),
          unit: this.domainService.users.getDisplayTag(role.role, { unitName: role.organisationUnit?.name })
        });
      }
    }

    if (user.serviceRoles.some(r => r.role === ServiceRoleEnum.ASSESSMENT)) {
      const assessments = await em
        .createQueryBuilder(InnovationAssessmentEntity, 'assessment')
        .select(['assessment.id', 'innovation.id', 'innovation.name'])
        .innerJoin('assessment.innovation', 'innovation', 'innovation.current_assessment_id = assessment.id')
        .where('assessment.assignTo = :userId', { userId })
        .andWhere('assessment.finishedAt IS NULL')
        .getMany();

      const userInfo = {
        id: user.id,
        name: usersInfoMap.getDisplayName(user.identityId),
        role: ServiceRoleEnum.ASSESSMENT
      };
      for (const assessment of assessments) {
        data.push({
          innovation: { id: assessment.innovation.id, name: assessment.innovation.name },
          supportedBy: [userInfo],
          unit: this.domainService.users.getDisplayTag(ServiceRoleEnum.ASSESSMENT, {})
        });
      }
    }

    return { count: data.length, data: data.sort((a, b) => a.innovation.name.localeCompare(b.innovation.name)) };
  }

  /**
   * converts the CreateRolesType into an array of roles to be saved in the database
   * @param data the create roles type
   * @returns array of roles to add to db
   */
  private createRolesType2Db(data: CreateRolesType): Parameters<UsersService['addDbRole']>[2][] {
    if (data.role === ServiceRoleEnum.ACCESSOR || data.role === ServiceRoleEnum.QUALIFYING_ACCESSOR) {
      return data.unitIds.map(unitId => ({ role: data.role, orgId: data.organisationId, unitId }));
    } else {
      return [{ role: data.role }];
    }
  }

  private isUuid(idOrEmail: string): boolean {
    try {
      Joi.attempt(idOrEmail, JoiHelper.AppCustomJoi().string().guid());
      return true;
    } catch {
      return false;
    }
  }
}
