import { OrganisationEntity, OrganisationUnitEntity, OrganisationUnitUserEntity, OrganisationUserEntity, UserEntity, UserRoleEntity } from '@admin/shared/entities';
import { AccessorOrganisationRoleEnum, NotifierTypeEnum, ServiceRoleEnum } from '@admin/shared/enums';
import { BadRequestError, NotFoundError, OrganisationErrorsEnum, UnprocessableEntityError, UserErrorsEnum } from '@admin/shared/errors';
import { CacheServiceSymbol, IdentityProviderService, IdentityProviderServiceSymbol, NotifierServiceSymbol, NotifierServiceType } from '@admin/shared/services';
import { CacheConfigType, CacheService } from '@admin/shared/services/storage/cache.service';
import type { DomainContextType } from '@admin/shared/types';
import { inject, injectable } from 'inversify';
import type { EntityManager } from 'typeorm';
import { BaseService } from './base.service';

@injectable()
export class UsersService extends BaseService {
  private cache: CacheConfigType['IdentityUserInfo'];

  constructor(
    @inject(CacheServiceSymbol) cacheService: CacheService,
    @inject(IdentityProviderServiceSymbol) private identityProviderService: IdentityProviderService,
    @inject(NotifierServiceSymbol) private notifierService: NotifierServiceType,
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
  async updateUser(requestUser: {id: string, identityId: string}, domainContext: DomainContextType, userId: string, data: { accountEnabled?: boolean | null, role?: null | { name: AccessorOrganisationRoleEnum, organisationId: string } }, entityManager?: EntityManager): Promise<void> {
    const manager = entityManager || this.sqlConnection.manager;

    await manager.transaction(async transaction => {
      const user = await this.sqlConnection
        .createQueryBuilder(UserEntity, 'user')
        .leftJoinAndSelect('user.userOrganisations', 'userOrganisations')
        .where('user.id = :userId', { userId })
        .getOne();

      if (!user) {
        throw new NotFoundError(UserErrorsEnum.USER_SQL_NOT_FOUND);
      }

      await transaction.update(UserEntity, { id: userId }, {
        ...data.accountEnabled != null && { lockedAt: data.accountEnabled === false ? new Date().toISOString() : null },
      });

      if (data.role) {
        const organisationUser = await transaction.createQueryBuilder(OrganisationUserEntity, 'organisationUser')
          .where('organisationUser.organisation_id = :organisationId', { organisationId: data.role.organisationId })
          .andWhere('organisationUser.user_id = :userId', { userId })
          .getOne();

        if (!organisationUser) {
          throw new NotFoundError(UserErrorsEnum.USER_INVALID_ACCESSOR_PARAMETERS);
        }

        await transaction.update(OrganisationUserEntity, { id: organisationUser.id }, { role: data.role.name });

        // TODO: IMPROVE THE SERVICE ROLE INFERENCE
        await transaction.update(UserRoleEntity, {user: {id: userId} , organisation: {id: data.role.organisationId }}, { role: ServiceRoleEnum[data.role.name] });
        
      }

      // Update identity provider if needed
      if (data.accountEnabled != null) {
        await this.identityProviderService.updateUserAsync(user.identityId, { accountEnabled: data.accountEnabled });

        // Send notification to user when locked
        if(!data.accountEnabled) {
          await this.notifierService.send(
            { id: requestUser.id, identityId: requestUser.identityId },
            NotifierTypeEnum.LOCK_USER,
            { user: { id: user.id, identityId: user.identityId } },
            domainContext,
          );
        }
      }

      // Remove cache entry
      await this.cache.delete(user.identityId);

    });

  }

  async createUser(
    requestUser: { id: string },
    data: {
      name: string,
      email: string,
      type: ServiceRoleEnum,
      organisationAcronym?: string | null,
      organisationUnitAcronym?: string | null,
      role?: AccessorOrganisationRoleEnum | null      
    }
  ): Promise<{ id: string }> {

    if ((data.type === ServiceRoleEnum.ACCESSOR || data.type === ServiceRoleEnum.QUALIFYING_ACCESSOR) && (!data.organisationAcronym || !data.organisationUnitAcronym || !data.role)) {
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
      const iId = await this.identityProviderService
        .createUser({ name: data.name, email: data.email, password: password });

      identityId = iId;
    }

    return await this.sqlConnection.transaction(async transaction => {

      const user = await transaction.save(UserEntity, UserEntity.new({
        identityId: identityId,
        createdBy: requestUser.id,
        updatedBy: requestUser.id
      }));

      // admin type
      if (data.type === ServiceRoleEnum.ADMIN) {
        await transaction.save(UserRoleEntity, UserRoleEntity.new({ user, role: ServiceRoleEnum.ADMIN }));
      }

      // accessor type
      if ((data.type === ServiceRoleEnum.ACCESSOR || data.type === ServiceRoleEnum.QUALIFYING_ACCESSOR) && organisation && unit && data.role) {
        const orgUser = await transaction.save(OrganisationUserEntity,
          OrganisationUserEntity.new({
            organisation,
            user,
            role: data.role,
            createdBy: requestUser.id,
            updatedBy: requestUser.id
          })
        );

        await transaction.save(OrganisationUnitUserEntity,
          OrganisationUnitUserEntity.new({
            organisationUnit: unit,
            organisationUser: orgUser,
            createdBy: requestUser.id,
            updatedBy: requestUser.id
          }));

        await transaction.save(UserRoleEntity, UserRoleEntity.new({ user, role: ServiceRoleEnum[data.role], organisation: organisation, organisationUnit: unit }));
      }

      // needs assessor type
      if (data.type === ServiceRoleEnum.ASSESSMENT) {
        await transaction.save(UserRoleEntity, UserRoleEntity.new({ user, role: ServiceRoleEnum.ASSESSMENT }));
      }

      return { id: user.id };
    });
  }

  async deleteAdmin(id: string): Promise<{ id: string }> {

    const user = await this.sqlConnection
      .createQueryBuilder(UserEntity, 'user')
      .innerJoinAndSelect('user.serviceRoles', 'roles')
      .where('user.id = :id', { id })
      .getOne();

    if (!user) {
      throw new NotFoundError(UserErrorsEnum.USER_SQL_NOT_FOUND);
    }

    if (!user.serviceRoles.map( r=> r.role ).includes(ServiceRoleEnum.ADMIN) || user.serviceRoles.length > 1) {
      throw new BadRequestError(UserErrorsEnum.USER_TYPE_INVALID);
    }

    //delete in b2C
    await this.identityProviderService.deleteUser(user.identityId);

    //set deleted in BD
    return this.sqlConnection.transaction(async transaction => {
      await transaction.update(
        UserEntity,
        { id: user.id },
        { deletedAt: new Date().toISOString()}
      );

      return { id: user.id };
    });
  }

}
