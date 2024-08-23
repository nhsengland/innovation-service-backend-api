import { inject, injectable } from 'inversify';
import type { EntityManager } from 'typeorm';

import {
  InnovationCollaboratorEntity,
  InnovationEntity,
  InnovationTransferEntity,
  OrganisationEntity,
  TermsOfUseEntity,
  TermsOfUseUserEntity,
  UserEntity,
  UserPreferenceEntity,
  UserRoleEntity
} from '@users/shared/entities';
import {
  InnovationCollaboratorStatusEnum,
  InnovationTransferStatusEnum,
  NotifierTypeEnum,
  OrganisationTypeEnum,
  PhoneUserPreferenceEnum,
  ServiceRoleEnum,
  TermsOfUseTypeEnum,
  UserStatusEnum
} from '@users/shared/enums';
import { NotFoundError, UnprocessableEntityError, UserErrorsEnum } from '@users/shared/errors';
import type { PaginationQueryParamsType } from '@users/shared/helpers';
import type {
  CacheConfigType,
  CacheService,
  DomainService,
  IdentityProviderService,
  NotifierService,
  RedisService
} from '@users/shared/services';
import SHARED_SYMBOLS from '@users/shared/services/symbols';

import type { HowDidYouFindUsAnswersType } from '@users/shared/entities/user/user.entity';
import type { DomainContextType } from '@users/shared/types';
import { BaseService } from './base.service';

@injectable()
export class UsersService extends BaseService {
  private cache: CacheConfigType['IdentityUserInfo'];

  constructor(
    @inject(SHARED_SYMBOLS.CacheService) cacheService: CacheService,
    @inject(SHARED_SYMBOLS.IdentityProviderService)
    private identityProviderService: IdentityProviderService,
    @inject(SHARED_SYMBOLS.NotifierService) private notifierService: NotifierService,
    @inject(SHARED_SYMBOLS.DomainService) private domainService: DomainService,
    @inject(SHARED_SYMBOLS.RedisService) private redisService: RedisService
  ) {
    super();
    this.cache = cacheService.get('IdentityUserInfo');
  }

  /**
   * checks if a user exists based on email
   * @param email the email to search
   * @returns true if the user exists.
   */
  async existsUserByEmail(email: string): Promise<boolean> {
    const authUser = await this.identityProviderService.getUserInfoByEmail(email);
    return !!authUser;
  }

  async getUserPendingInnovationTransfers(
    email: string,
    entityManager?: EntityManager
  ): Promise<{ id: string; innovation: { id: string; name: string } }[]> {
    const em = entityManager ?? this.sqlConnection.manager;

    const dbUserTransfers =
      (await em
        .createQueryBuilder(InnovationTransferEntity, 'innovationTransfer')
        .innerJoinAndSelect('innovationTransfer.innovation', 'innovation')
        .where('DATEDIFF(day, innovationTransfer.created_at, GETDATE()) < 31')
        .andWhere('innovationTransfer.status = :status', {
          status: InnovationTransferStatusEnum.PENDING
        })
        .andWhere('innovationTransfer.email = :email', { email: email })
        .getMany()) || [];

    return dbUserTransfers.map(item => ({
      id: item.id,
      innovation: {
        id: item.innovation.id,
        name: item.innovation.name
      }
    }));
  }

  async createUserInnovator(user: { identityId: string }, entityManager?: EntityManager): Promise<{ id: string }> {
    const em = entityManager ?? this.sqlConnection.manager;

    const identityIdExists = !!(await em
      .createQueryBuilder(UserEntity, 'users')
      .where('external_id = :userId', { userId: user.identityId })
      .getCount());
    if (identityIdExists) {
      throw new UnprocessableEntityError(UserErrorsEnum.USER_ALREADY_EXISTS);
    }

    return em.transaction(async transactionManager => {
      const dbUser = await transactionManager.save(
        UserEntity.new({
          identityId: user.identityId
        })
      );

      // Creates default organisation.
      const dbOrganisation = await transactionManager.save(
        OrganisationEntity.new({
          name: user.identityId,
          acronym: null,
          type: OrganisationTypeEnum.INNOVATOR,
          size: null,
          isShadow: true,
          createdBy: dbUser.id,
          updatedBy: dbUser.id
        })
      );

      // add innovator role
      const userRole = await transactionManager.save(
        UserRoleEntity,
        UserRoleEntity.new({
          user: dbUser,
          role: ServiceRoleEnum.INNOVATOR,
          organisation: dbOrganisation
        })
      );

      // Accept last terms of use released.
      const lastTermsOfUse = await em
        .createQueryBuilder(TermsOfUseEntity, 'termsOfUse')
        .where('termsOfUse.touType = :type', { type: TermsOfUseTypeEnum.INNOVATOR })
        .orderBy('termsOfUse.releasedAt', 'DESC')
        .getOne();

      if (lastTermsOfUse) {
        await transactionManager.save(
          TermsOfUseUserEntity.new({
            termsOfUse: TermsOfUseEntity.new({ id: lastTermsOfUse.id }),
            user: UserEntity.new({ id: dbUser.id }),
            acceptedAt: new Date(),
            createdBy: dbUser.id,
            updatedBy: dbUser.id
          })
        );
      }

      await this.notifierService.send(
        {
          id: dbUser.id,
          identityId: dbUser.identityId,
          organisation: {
            id: dbOrganisation.id,
            name: dbOrganisation.name,
            acronym: dbOrganisation.acronym
          },
          currentRole: { id: userRole.id, role: ServiceRoleEnum.INNOVATOR }
        },
        NotifierTypeEnum.ACCOUNT_CREATION,
        {}
      );

      return { id: dbUser.id };
    });
  }

  async updateUserInfo(
    user: { id: string; identityId: string; firstTimeSignInAt?: null | Date },
    currentRole: ServiceRoleEnum | '',
    data: {
      displayName: string;
      contactByEmail?: boolean;
      contactByPhone?: boolean;
      contactByPhoneTimeframe?: PhoneUserPreferenceEnum | null;
      contactDetails?: string | null;
      mobilePhone?: string | null;
      organisation?: {
        id: string;
        isShadow: boolean;
        name?: null | string;
        size?: null | string;
        description?: null | string;
        registrationNumber?: null | string;
      };
      howDidYouFindUsAnswers: HowDidYouFindUsAnswersType;
    },
    entityManager?: EntityManager
  ): Promise<{ id: string }> {
    await this.identityProviderService.updateUser(user.identityId, {
      displayName: data.displayName,
      ...(data.mobilePhone !== undefined ? { mobilePhone: data.mobilePhone } : {})
    });

    const em = entityManager ?? this.sqlConnection.manager;

    // NOTE: Only innovators can change their organisation, we make a sanity check here.
    if (currentRole === ServiceRoleEnum.INNOVATOR) {
      await em.transaction(async transaction => {
        // If user does not have firstTimeSignInAt, it means this is the first time the user is signing in
        // Updates the firstTimeSignInAt with the current date.
        if (!user.firstTimeSignInAt) {
          await transaction.getRepository(UserEntity).update(user.id, {
            firstTimeSignInAt: new Date().toISOString(),
            howDidYouFindUsAnswers: Object.keys(data.howDidYouFindUsAnswers).length
              ? Object.fromEntries(Object.entries(data.howDidYouFindUsAnswers).filter(([_k, v]) => v))
              : null
          });
        }

        let updateIndex = false;
        if (data.organisation) {
          const organisationData: {
            isShadow: boolean;
            name?: string;
            size?: null | string;
            description?: null | string;
            registrationNumber?: null | string;
          } = {
            isShadow: data.organisation.isShadow
          };

          if (organisationData.isShadow) {
            organisationData.name = user.identityId;
            organisationData.size = null;
            organisationData.description = null;
            organisationData.registrationNumber = null;
          } else {
            if (data.organisation.name) {
              organisationData.name = data.organisation.name;
            }
            if (data.organisation.size) {
              organisationData.size = data.organisation.size;
            }
            if (data.organisation.description) {
              organisationData.description = data.organisation.description;
            }
            organisationData.registrationNumber = data.organisation.registrationNumber;

            updateIndex = true;
          }

          await transaction.getRepository(OrganisationEntity).update(data.organisation.id, organisationData);
        }

        const preferences: {
          contactByPhone: boolean;
          contactByEmail: boolean;
          contactByPhoneTimeframe: null | PhoneUserPreferenceEnum;
          contactDetails: null | string;
        } = {
          contactByPhone: data.contactByPhone as boolean,
          contactByEmail: data.contactByEmail as boolean,
          contactByPhoneTimeframe: data.contactByPhoneTimeframe ?? null,
          contactDetails: data.contactDetails ?? null
        };

        await this.upsertUserPreferences(user.id, preferences, transaction);

        if (updateIndex) {
          // Update ES index for all the innovations that the user is owner.
          const innovations = await transaction
            .createQueryBuilder(InnovationEntity, 'innovation')
            .select(['innovation.id'])
            .where('innovation.owner_id = :ownerId', { ownerId: user.id })
            .getMany();
          await this.redisService.addToSet(
            'elasticsearch',
            innovations.map(i => i.id)
          );
        }
      });
    }

    // Remove the cache entry on update
    await this.cache.delete(user.identityId);

    return { id: user.id };
  }

  /**
   * gets the users list for the give user types crossing information between the identity provider and the database
   * @param userTypes array of user types to retrieve
   * @param fields extra fields to return
   * @returns user object with extra selected fields
   */
  async getUserList(
    filters: { userTypes: ServiceRoleEnum[]; organisationUnitId?: string; onlyActive?: boolean },
    fields: 'email'[],
    pagination: PaginationQueryParamsType<'createdAt'>,
    entityManager?: EntityManager
  ): Promise<{
    count: number;
    data: {
      id: string;
      name: string;
      lockedAt: Date | null;
      roles: UserRoleEntity[];
      email?: string;
    }[];
  }> {
    const fieldSet = new Set(fields);

    const em = entityManager ?? this.sqlConnection.manager;

    const query = em
      .createQueryBuilder(UserEntity, 'user')
      .innerJoinAndSelect('user.serviceRoles', 'serviceRoles')
      .andWhere('user.status <> :userDeleted', { userDeleted: UserStatusEnum.DELETED });

    // Filters
    if (filters.userTypes.length > 0) {
      query.andWhere('serviceRoles.role IN (:...userRoles)', { userRoles: filters.userTypes });
    }

    if (filters.organisationUnitId) {
      query
        .leftJoin('serviceRoles.organisationUnit', 'roleOrganisationUnit')
        .andWhere('roleOrganisationUnit.id = :organisationUnitId', {
          organisationUnitId: filters.organisationUnitId
        });
    }

    if (filters.onlyActive) {
      query.andWhere('user.status = :userActive', { userActive: UserStatusEnum.ACTIVE });
    }

    query.skip(pagination.skip).take(pagination.take);

    for (const [key, order] of Object.entries(pagination.order)) {
      let field: string;
      switch (key) {
        case 'createdAt':
          field = 'user.createdAt';
          break;
        default:
          field = 'user.createdAt';
          break;
      }
      query.addOrderBy(field, order);
    }

    // Get users from database
    const [dbUsers, count] = await query.getManyAndCount();
    const identityUsers = await this.identityProviderService.getUsersList(dbUsers.map(items => items.identityId));

    const users = await Promise.all(
      dbUsers.map(async dbUser => {
        const identityUser = identityUsers.find(item => item.identityId === dbUser.identityId);
        if (!identityUser) {
          throw new NotFoundError(UserErrorsEnum.USER_IDENTITY_PROVIDER_NOT_FOUND, {
            details: { context: 'S.DU.gUL' }
          });
        }

        return {
          id: dbUser.id,
          isActive: dbUser.status === UserStatusEnum.ACTIVE,
          roles: dbUser.serviceRoles,
          name: identityUser.displayName ?? 'N/A',
          lockedAt: dbUser.lockedAt,
          ...(fieldSet.has('email') ? { email: identityUser?.email ?? 'N/A' } : {})
        };
      })
    );

    return {
      count: count,
      data: users
    };
  }

  /**
   * upserts the user preferences
   * @param userId the user id
   * @param preferences the preferences to upsert
   */
  async upsertUserPreferences(
    userId: string,
    preferences: {
      contactByPhone: boolean;
      contactByEmail: boolean;
      contactByPhoneTimeframe: PhoneUserPreferenceEnum | null;
      contactDetails: string | null;
    },
    entityManager?: EntityManager
  ): Promise<void> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const userPreferences = await connection
      .createQueryBuilder(UserPreferenceEntity, 'preference')
      .where('preference.user = :userId', { userId: userId })
      .getOne();
    let preference: {
      user: {
        id: string;
      };
      contactByPhone: boolean;
      contactByEmail: boolean;
      contactByPhoneTimeframe: PhoneUserPreferenceEnum | null;
      contactDetails: string | null;
      createdBy: string;
      updatedBy: string;
      id?: string;
    } = {
      user: { id: userId },
      createdBy: userId, // this is only for the first time as BaseEntity defines it as update: false
      updatedBy: userId,
      ...preferences
    };

    if (userPreferences) {
      preference = {
        id: userPreferences.id,
        ...preference
      };
    }

    await connection.save(UserPreferenceEntity, preference);
  }

  async getCollaborationsInvitesList(
    email: string,
    status: InnovationCollaboratorStatusEnum = InnovationCollaboratorStatusEnum.PENDING,
    entityManager?: EntityManager
  ): Promise<
    {
      id: string;
      invitedAt: Date;
      innovation: {
        id: string;
        name: string;
      };
    }[]
  > {
    const em = entityManager ?? this.sqlConnection.manager;

    const invites = await em
      .createQueryBuilder(InnovationCollaboratorEntity, 'collaborator')
      .select(['collaborator.id', 'collaborator.invitedAt', 'innovation.id', 'innovation.name'])
      .innerJoin('collaborator.innovation', 'innovation')
      .where('collaborator.email = :email', { email })
      .andWhere('collaborator.status = :status', { status: status })
      .andWhere('DATEDIFF(day, collaborator.invitedAt, GETDATE()) < 31')
      .getMany();

    const data = invites.map(invite => ({
      id: invite.id,
      invitedAt: invite.invitedAt,
      innovation: {
        id: invite.innovation.id,
        name: invite.innovation.name
      }
    }));

    return data;
  }

  async deleteUser(
    domainContext: DomainContextType,
    data: { reason: string },
    entityManager?: EntityManager
  ): Promise<void> {
    // This function calls the domain function to delete self
    await this.domainService.users.deleteUser(domainContext, domainContext.id, data, entityManager);
  }

  async getUserMfaInfo(domainContext: DomainContextType): ReturnType<IdentityProviderService['getMfaInfo']> {
    return this.identityProviderService.getMfaInfo(domainContext.identityId);
  }

  async upsertUserMfa(
    domainContext: DomainContextType,
    data: Parameters<IdentityProviderService['upsertUserMfa']>[1]
  ): Promise<void> {
    return this.identityProviderService.upsertUserMfa(domainContext.identityId, data);
  }
}
