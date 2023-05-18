import { inject, injectable } from 'inversify';
import type { EntityManager } from 'typeorm';

import {
  OrganisationEntity,
  OrganisationUnitEntity,
  OrganisationUnitUserEntity,
  OrganisationUserEntity,
  UserEntity,
  UserRoleEntity
} from '@admin/shared/entities';
import { AccessorOrganisationRoleEnum, NotifierTypeEnum, ServiceRoleEnum } from '@admin/shared/enums';
import {
  BadRequestError,
  NotFoundError,
  OrganisationErrorsEnum,
  UnprocessableEntityError,
  UserErrorsEnum
} from '@admin/shared/errors';
import { CacheConfigType, CacheService, IdentityProviderService, NotifierService } from '@admin/shared/services';
import type { DomainContextType } from '@admin/shared/types';

import SHARED_SYMBOLS from '@admin/shared/services/symbols';
import { BaseService } from './base.service';

@injectable()
export class UsersService extends BaseService {
  private cache: CacheConfigType['IdentityUserInfo'];

  constructor(
    @inject(SHARED_SYMBOLS.CacheService) cacheService: CacheService,
    @inject(SHARED_SYMBOLS.IdentityProviderService) private identityProviderService: IdentityProviderService,
    @inject(SHARED_SYMBOLS.NotifierService) private notifierService: NotifierService
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
            lockedAt: data.accountEnabled === false ? new Date().toISOString() : null
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
    requestUser: { id: string },
    data: {
      name: string;
      email: string;
      type: ServiceRoleEnum;
      organisationAcronym?: string | null;
      organisationUnitAcronym?: string | null;
      role?: AccessorOrganisationRoleEnum | null;
    }
  ): Promise<{ id: string }> {
    if (
      (data.type === ServiceRoleEnum.ACCESSOR || data.type === ServiceRoleEnum.QUALIFYING_ACCESSOR) &&
      (!data.organisationAcronym || !data.organisationUnitAcronym || !data.role)
    ) {
      throw new BadRequestError(UserErrorsEnum.USER_INVALID_ACCESSOR_PARAMETERS);
    }

    let organisation: OrganisationEntity | null;
    let unit: OrganisationUnitEntity | null;

    if (data.organisationAcronym) {
      organisation = await this.sqlConnection
        .createQueryBuilder(OrganisationEntity, 'organisation')
        .where('organisation.acronym = :acronym', { acronym: data.organisationAcronym })
        .getOne();

      if (!organisation) {
        throw new NotFoundError(OrganisationErrorsEnum.ORGANISATION_NOT_FOUND);
      }

      if (data.organisationUnitAcronym) {
        unit = await this.sqlConnection
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
      const user = await this.sqlConnection
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

    return await this.sqlConnection.transaction(async transaction => {
      const user = await transaction.save(
        UserEntity,
        UserEntity.new({
          identityId: identityId,
          createdBy: requestUser.id,
          updatedBy: requestUser.id
        })
      );

      // admin type
      if (data.type === ServiceRoleEnum.ADMIN) {
        await transaction.save(UserRoleEntity, UserRoleEntity.new({ user, role: ServiceRoleEnum.ADMIN }));
      }

      // accessor type
      if (
        (data.type === ServiceRoleEnum.ACCESSOR || data.type === ServiceRoleEnum.QUALIFYING_ACCESSOR) &&
        organisation &&
        unit &&
        data.role
      ) {
        const orgUser = await transaction.save(
          OrganisationUserEntity,
          OrganisationUserEntity.new({
            organisation,
            user,
            role: data.role,
            createdBy: requestUser.id,
            updatedBy: requestUser.id
          })
        );

        await transaction.save(
          OrganisationUnitUserEntity,
          OrganisationUnitUserEntity.new({
            organisationUnit: unit,
            organisationUser: orgUser,
            createdBy: requestUser.id,
            updatedBy: requestUser.id
          })
        );

        await transaction.save(
          UserRoleEntity,
          UserRoleEntity.new({
            user,
            role: ServiceRoleEnum[data.role],
            organisation: organisation,
            organisationUnit: unit,
            createdBy: requestUser.id,
            lockedAt: organisation.inactivatedAt || unit.inactivatedAt ? new Date() : null
          })
        );
      }

      // needs assessor type
      if (data.type === ServiceRoleEnum.ASSESSMENT) {
        await transaction.save(UserRoleEntity, UserRoleEntity.new({ user, role: ServiceRoleEnum.ASSESSMENT }));
      }

      return { id: user.id };
    });
  }
}
