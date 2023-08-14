import { inject, injectable } from 'inversify';
import Joi from 'joi';
import type { EntityManager } from 'typeorm';

import {
  OrganisationEntity,
  OrganisationUnitEntity,
  OrganisationUnitUserEntity,
  OrganisationUserEntity,
  UserEntity,
  UserRoleEntity
} from '@admin/shared/entities';
import { AccessorOrganisationRoleEnum, NotifierTypeEnum, ServiceRoleEnum, UserStatusEnum } from '@admin/shared/enums';
import {
  BadRequestError,
  NotFoundError,
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
import type { DomainContextType, RoleType } from '@admin/shared/types';

import SHARED_SYMBOLS from '@admin/shared/services/symbols';
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
      role?: { name: AccessorOrganisationRoleEnum; organisationId: string };
    },
    entityManager?: EntityManager
  ): Promise<{ id: string }> {
    const sqlConnection = entityManager ?? this.sqlConnection.manager;

    const dbUser = await sqlConnection
      .createQueryBuilder(UserEntity, 'user')
      .select(['user.id', 'user.identityId'])
      .innerJoin('user.serviceRoles', 'userRoles')
      .leftJoin('userRoles.organisation', 'organisation')
      .where('user.id = :userId', { userId })
      .getOne();

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

        await this.identityProviderService.updateUserAsync(dbUser.identityId, {
          accountEnabled: data.accountEnabled
        });
      }

      if (data.role) {
        const organisationUser = await transaction
          .createQueryBuilder(OrganisationUserEntity, 'organisationUser')
          .where('organisationUser.organisation_id = :organisationId', {
            organisationId: data.role.organisationId
          })
          .andWhere('organisationUser.user_id = :userId', { userId })
          .getOne();

        if (!organisationUser) {
          throw new NotFoundError(UserErrorsEnum.USER_INVALID_ACCESSOR_PARAMETERS);
        }

        await transaction.update(OrganisationUserEntity, { id: organisationUser.id }, { role: data.role.name });

        // TODO: IMPROVE THE SERVICE ROLE INFERENCE
        await transaction.update(
          UserRoleEntity,
          { user: { id: userId }, organisation: { id: data.role.organisationId } },
          { role: ServiceRoleEnum[data.role.name] }
        );
      }

      // Send notification to locked user.
      if (data.accountEnabled != undefined && !data.accountEnabled) {
        await this.notifierService.send(context, NotifierTypeEnum.LOCK_USER, {
          user: { identityId: dbUser.identityId }
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
      type: ServiceRoleEnum;
      organisationAcronym?: string | null;
      organisationUnitAcronym?: string | null;
      role?: AccessorOrganisationRoleEnum | null;
    },
    enitityManager?: EntityManager
  ): Promise<{ id: string }> {
    if (
      (data.type === ServiceRoleEnum.ACCESSOR || data.type === ServiceRoleEnum.QUALIFYING_ACCESSOR) &&
      (!data.organisationAcronym || !data.organisationUnitAcronym || !data.role)
    ) {
      throw new BadRequestError(UserErrorsEnum.USER_INVALID_ACCESSOR_PARAMETERS);
    }

    let organisation: OrganisationEntity | null;
    let unit: OrganisationUnitEntity | null;

    const em = enitityManager ?? this.sqlConnection.manager;

    if (data.organisationAcronym) {
      organisation = await em
        .createQueryBuilder(OrganisationEntity, 'organisation')
        .where('organisation.acronym = :acronym', { acronym: data.organisationAcronym })
        .getOne();

      if (!organisation) {
        throw new NotFoundError(OrganisationErrorsEnum.ORGANISATION_NOT_FOUND);
      }

      if (data.organisationUnitAcronym) {
        unit = await em
          .createQueryBuilder(OrganisationUnitEntity, 'org_unit')
          .innerJoin('org_unit.organisation', 'org')
          .where('org.id = :orgId', { orgId: organisation.id })
          .andWhere('org_unit.acronym = :acronym', { acronym: data.organisationUnitAcronym })
          .getOne();

        if (!unit) {
          throw new NotFoundError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND);
        }
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

      // TODO: This will be changed to a for or a call to `addRoles` when the new implementation is done
      if (data.type === ServiceRoleEnum.ADMIN || data.type === ServiceRoleEnum.ASSESSMENT) {
        await this.addDbRole(domainContext, user.id, { role: data.type }, transaction);
      }

      if (
        (data.type === ServiceRoleEnum.ACCESSOR || data.type === ServiceRoleEnum.QUALIFYING_ACCESSOR) &&
        organisation &&
        unit
      ) {
        await this.addDbRole(
          domainContext,
          user.id,
          { role: data.type, orgId: organisation.id, unitId: unit.id },
          transaction
        );
      }

      return { id: user.id };
    });
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
    data: Parameters<UsersService['addDbRole']>[2][],
    entityManager?: EntityManager
  ): Promise<{ id: string }[]> {
    const roles = [];
    for (const cur of data) {
      // TODO: Add validation call and a transaction could be important as-well.
      const role = await this.addDbRole(domainContext, userId, cur, entityManager);
      roles.push(role);
    }
    return roles;
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
    entityManager?: EntityManager
  ): Promise<{ id: string }> {
    const em = entityManager ?? this.sqlConnection.manager;

    return await em.transaction(async transaction => {
      let role: null | UserRoleEntity = null;

      if (data.role === ServiceRoleEnum.ADMIN || data.role === ServiceRoleEnum.ASSESSMENT) {
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
      }

      if (data.role === ServiceRoleEnum.ACCESSOR || data.role === ServiceRoleEnum.QUALIFYING_ACCESSOR) {
        const unit = await transaction
          .createQueryBuilder(OrganisationUnitEntity, 'unit')
          .select(['unit.id', 'unit.inactivatedAt'])
          .where('unit.id = :unitId', { unitId: data.unitId })
          .getOne();
        if (!unit) {
          throw new NotFoundError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND);
        }

        const organisationUser = await this.getOrCreateOrganisationUser(
          data.orgId,
          userId,
          data.role,
          domainContext.id,
          transaction
        );

        await transaction.save(
          OrganisationUnitUserEntity,
          OrganisationUnitUserEntity.new({
            organisationUnit: unit,
            organisationUser: organisationUser,
            createdBy: domainContext.id,
            updatedBy: domainContext.id
          })
        );

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
      }

      return { id: role!.id };
    });
  }

  private async getOrCreateOrganisationUser(
    organisationId: string,
    userId: string,
    role: ServiceRoleEnum,
    requestUserId: string,
    entityManager?: EntityManager
  ): Promise<OrganisationUserEntity> {
    const em = entityManager ?? this.sqlConnection.manager;

    const organisationUser = await em
      .createQueryBuilder(OrganisationUserEntity, 'orgUser')
      .where('orgUser.user_id = :userId', { userId })
      .andWhere('orgUser.organisation_id = :organisationId', { organisationId })
      .getOne();

    if (organisationUser) {
      return organisationUser;
    }

    return await em.save(
      OrganisationUserEntity,
      OrganisationUserEntity.new({
        organisation: OrganisationEntity.new({ id: organisationId }),
        user: UserEntity.new({ id: userId }),
        role: role as any,
        createdBy: requestUserId,
        updatedBy: requestUserId
      })
    );
  }

  private isUuid(idOrEmail: string): boolean {
    try {
      Joi.attempt(idOrEmail, Joi.string().guid());
      return true;
    } catch (_e) {
      return false;
    }
  }
}
