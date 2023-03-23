import { inject, injectable } from 'inversify';
import type { EntityManager, Repository } from 'typeorm';

import { InnovationEntity, InnovationSupportEntity, InnovationTransferEntity, OrganisationEntity, OrganisationUserEntity, TermsOfUseEntity, TermsOfUseUserEntity, UserEntity, UserPreferenceEntity, UserRoleEntity } from '@users/shared/entities';
import { InnovationCollaboratorStatusEnum, InnovationTransferStatusEnum, InnovatorOrganisationRoleEnum, NotifierTypeEnum, OrganisationTypeEnum, PhoneUserPreferenceEnum, ServiceRoleEnum, TermsOfUseTypeEnum } from '@users/shared/enums';
import { NotFoundError, UnprocessableEntityError, UserErrorsEnum } from '@users/shared/errors';
import { CacheServiceSymbol, CacheServiceType, DomainServiceSymbol, DomainServiceType, IdentityProviderServiceSymbol, IdentityProviderServiceType, NotifierServiceSymbol, NotifierServiceType } from '@users/shared/services';
import type { CacheConfigType } from '@users/shared/services/storage/cache.service';
import type { DateISOType } from '@users/shared/types';

import type { MinimalInfoDTO, UserFullInfoDTO } from '../_types/users.types';

import { InnovationCollaboratorEntity } from '@users/shared/entities/innovation/innovation-collaborator.entity';
import type { PaginationQueryParamsType } from '@users/shared/helpers';
import { BaseService } from './base.service';


@injectable()
export class UsersService extends BaseService {

  userRepository: Repository<UserEntity>;
  organisationRepository: Repository<OrganisationEntity>;
  private cache: CacheConfigType['IdentityUserInfo'];

  constructor(
    @inject(CacheServiceSymbol) cacheService: CacheServiceType,
    @inject(DomainServiceSymbol) private domainService: DomainServiceType,
    @inject(IdentityProviderServiceSymbol) private identityProviderService: IdentityProviderServiceType,
    @inject(NotifierServiceSymbol) private notifierService: NotifierServiceType
  ) {
    super();
    this.userRepository = this.sqlConnection.getRepository<UserEntity>(UserEntity);
    this.organisationRepository = this.sqlConnection.getRepository<OrganisationEntity>(OrganisationEntity);
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

  /**
   * Returns the user information from the identity provider.
   * @param userId the user identifier.
   * @returns the user information.
   */
  async getUserById(
    userId: string,
    params: {
      model: 'minimal' | 'full'
    }
  ): Promise<MinimalInfoDTO | UserFullInfoDTO> {
    const user = await this.domainService.users.getUserInfo({ userId });
    const model = params.model;
    switch (model) {
      case 'minimal':
        return {
          id: user.id,
          displayName: user.displayName
        };
      case 'full':
        const innovations = await this.sqlConnection.createQueryBuilder(InnovationEntity, 'innovation')
          .select('innovation.id', 'innovation_id')
          .addSelect('innovation.name', 'innovation_name')
          .where('innovation.owner_id = :userId', { userId: user.id })
          .getMany();

        // TODO this is picking only the first for now and will be changed when admin supports more than one role
        const role = user.roles[0];
        if (!role) {
          throw new UnprocessableEntityError(UserErrorsEnum.USER_TYPE_INVALID);
        }

        const supportMap = new Map();
        const supportUserId = user.organisations.flatMap(o => o.organisationUnits.map(u => u.organisationUnitUser.id));
        if (supportUserId.length > 0) {
          const supports = await this.sqlConnection.createQueryBuilder(InnovationSupportEntity, 'support')
            .select('organisationUnitUsers.id', 'organisationUnitUsers_id')
            .addSelect('COUNT(support.id)', 'support_count')
            .innerJoin('support.organisationUnitUsers', 'organisationUnitUsers')
            .where('organisationUnitUsers.id IN (:...supportUserId)', { supportUserId })
            .groupBy('organisationUnitUsers.id')
            .getRawMany();
          supports.forEach(s => supportMap.set(s.organisationUnitUsers_id, s.support_count));
        }

        return {
          id: user.id,
          email: user.email,
          phone: user.phone,
          displayName: user.displayName,
          type: role.role,  // see previous TODO
          lockedAt: user.lockedAt,
          innovations: innovations,
          userOrganisations: user.organisations.map(o => ({
            id: o.id,
            name: o.name,
            size: o.size,
            role: o.role,
            isShadow: o.isShadow,
            units: o.organisationUnits.map(u => ({
              id: u.id,
              name: u.name,
              acronym: u.acronym,
              supportCount: supportMap.get(u.organisationUnitUser.id)
            }))
          }))
        };
      default:
        const unknownModel: never = model;
        throw new UnprocessableEntityError(UserErrorsEnum.USER_MODEL_INVALID, { details: { model: unknownModel } });
    }
  }


  async getUserPendingInnovationTransfers(email: string): Promise<{ id: string, innovation: { id: string, name: string } }[]> {

    const dbUserTransfers = await this.sqlConnection.createQueryBuilder(InnovationTransferEntity, 'innovationTransfer')
      .innerJoinAndSelect('innovationTransfer.innovation', 'innovation')
      .where('DATEDIFF(day, innovationTransfer.created_at, GETDATE()) < 31')
      .andWhere('innovationTransfer.status = :status', { status: InnovationTransferStatusEnum.PENDING })
      .andWhere('innovationTransfer.email = :email', { email: email })
      .getMany() || [];

    return dbUserTransfers.map(item => ({
      id: item.id,
      innovation: {
        id: item.innovation.id,
        name: item.innovation.name
      }
    }));

  }

  async createUserInnovator(user: { identityId: string }, data: { surveyId: null | string }): Promise<{ id: string }> {

    const identityIdExists = !!(await this.sqlConnection.createQueryBuilder(UserEntity, 'users').where('external_id = :userId', { userId: user.identityId }).getCount());
    if (identityIdExists) {
      throw new UnprocessableEntityError(UserErrorsEnum.USER_ALREADY_EXISTS);
    }


    return this.sqlConnection.transaction(async transactionManager => {

      const dbUser = await transactionManager.save(UserEntity.new({
        identityId: user.identityId,
        surveyId: data.surveyId,
      }));

      // Creates default organisation.
      const dbOrganisation = await transactionManager.save(OrganisationEntity.new({
        name: user.identityId,
        acronym: null,
        type: OrganisationTypeEnum.INNOVATOR,
        size: null,
        isShadow: true,
        createdBy: dbUser.id,
        updatedBy: dbUser.id,
      }));

      await transactionManager.save(OrganisationUserEntity.new({
        organisation: dbOrganisation,
        user: dbUser,
        role: InnovatorOrganisationRoleEnum.INNOVATOR_OWNER,
        createdBy: dbUser.id,
        updatedBy: dbUser.id
      }));

      // add innovator role
      const userRole = await transactionManager.save(UserRoleEntity, UserRoleEntity.new({ user: dbUser, role: ServiceRoleEnum.INNOVATOR, organisation: dbOrganisation }));

      // Accept last terms of use released.
      const lastTermsOfUse = await this.sqlConnection.createQueryBuilder(TermsOfUseEntity, 'termsOfUse')
        .where('termsOfUse.touType = :type', { type: TermsOfUseTypeEnum.INNOVATOR })
        .orderBy('termsOfUse.releasedAt', 'DESC')
        .getOne();

      if (lastTermsOfUse) {
        await transactionManager.save(TermsOfUseUserEntity.new({
          termsOfUse: TermsOfUseEntity.new({ id: lastTermsOfUse.id }),
          user: UserEntity.new({ id: dbUser.id }),
          acceptedAt: new Date().toISOString(),
          createdBy: dbUser.id,
          updatedBy: dbUser.id
        }));
      }

      await this.notifierService.send(
        { id: dbUser.id, identityId: dbUser.identityId },
        NotifierTypeEnum.INNOVATOR_ACCOUNT_CREATION,
        {},
        {
          id: dbUser.id,
          identityId: dbUser.identityId,
          organisation: {
            id: dbOrganisation.id,
            name: dbOrganisation.name,
            acronym: dbOrganisation.acronym
          },
          currentRole: { id: userRole.id, role: ServiceRoleEnum.INNOVATOR },

        },
      );

      return { id: dbUser.id };

    });

  }


  async updateUserInfo(
    user: { id: string, identityId: string, firstTimeSignInAt?: null | DateISOType },
    currentRole: ServiceRoleEnum | '',
    data: {
      displayName: string,
      contactByEmail?: boolean,
      contactByPhone?: boolean,
      contactByPhoneTimeframe?: PhoneUserPreferenceEnum | null,
      contactDetails?: string | null,
      mobilePhone?: string | null,
      organisation?: { id: string, isShadow: boolean, name?: null | string, size?: null | string, description?: null | string, registrationNumber?: null | string }
    }
  ): Promise<{ id: string }> {

    await this.identityProviderService.updateUser(user.identityId, {
      displayName: data.displayName,
      ...(data.mobilePhone !== undefined ? { mobilePhone: data.mobilePhone } : {})
    });

    // NOTE: Only innovators can change their organisation, we make a sanity check here.
    if (currentRole === ServiceRoleEnum.INNOVATOR) {

      await this.sqlConnection.transaction(async transaction => {

        // If user does not have firstTimeSignInAt, it means this is the first time the user is signing in
        // Updates the firstTimeSignInAt with the current date.
        if (!user.firstTimeSignInAt) {
          await transaction.getRepository(UserEntity).update(user.id, { firstTimeSignInAt: new Date().toISOString() });
        }

        if (data.organisation) {

          const organisationData: { isShadow: boolean, name?: string, size?: null | string, description?: null | string, registrationNumber?: null | string } = {
            isShadow: data.organisation.isShadow,
          };

          if (organisationData.isShadow) {
            organisationData.name = user.identityId;
            organisationData.size = null;
            organisationData.description = null;
            organisationData.registrationNumber = null;
          } else {
            if (data.organisation.name) { organisationData.name = data.organisation.name; }
            if (data.organisation.size) { organisationData.size = data.organisation.size; }
            if (data.organisation.description) { organisationData.description = data.organisation.description; }
            organisationData.registrationNumber = data.organisation.registrationNumber;
          }

          await transaction.getRepository(OrganisationEntity).update(data.organisation.id, organisationData);

        }

        const preferences: { contactByPhone: boolean, contactByEmail: boolean, contactByPhoneTimeframe: null | PhoneUserPreferenceEnum, contactDetails: null | string } = {
          contactByPhone: data.contactByPhone as boolean,
          contactByEmail: data.contactByEmail as boolean,
          contactByPhoneTimeframe: data.contactByPhoneTimeframe ?? null,
          contactDetails: data.contactDetails ?? null
        };

        await this.upsertUserPreferences(user.id, preferences, transaction);

      });
    }

    // Remove the cache entry on update
    await this.cache.delete(user.identityId);

    return { id: user.id };
  }

  async deleteUserInfo(userId: string, reason?: string): Promise<{ id: string }> {

    return this.sqlConnection.transaction(async transactionManager => {

      const user = await this.userRepository.findOne({
        where: { identityId: userId }
      });

      if (!user) {
        throw new NotFoundError(UserErrorsEnum.USER_SQL_NOT_FOUND);
      }

      //const innovations = await this.innovationRepository.find({ where: { owner: user.id } });

      // WIP!!!!!
      // for (const innovation of innovations) {

      //   await this.innovationService.archiveInnovation(
      //     requestUser,
      //     innovation.id,
      //     reason,
      //     transactionManager
      //   );
      // }

      await this.identityProviderService.deleteUser(userId);

      user.deletedAt = new Date().toISOString();
      user.deleteReason = reason || '';

      const result = await transactionManager.save(user);

      return { id: result.id };

    });

  }

  /**
   * gets the users list for the give user types crossing information between the identity provider and the database
   * @param userTypes array of user types to retrieve
   * @param fields extra fields to return
   * @returns user object with extra selected fields
   */
  async getUserList(
    filters: { userTypes: ServiceRoleEnum[], organisationUnitId?: string, onlyActive?: boolean },
    fields: ('email')[],
    pagination: PaginationQueryParamsType<'createdAt'>,
  ): Promise<{
    count: number,
    data: {
      id: string;
      name: string;
      lockedAt: string | null;
      roles: UserRoleEntity[];
      email?: string;
      organisationUnitUserId?: string;
    }[]
  }> {
    const fieldSet = new Set(fields);

    const query = this.sqlConnection.createQueryBuilder(UserEntity, 'user')
      .innerJoinAndSelect('user.serviceRoles', 'serviceRoles');

    // Filters
    if (filters.userTypes.length > 0) {
      query.andWhere('serviceRoles.role IN (:...userRoles)', { userRoles: filters.userTypes });
    }

    if (filters.organisationUnitId) {
      query
        .leftJoin('serviceRoles.organisationUnit', 'roleOrganisationUnit')
        .leftJoinAndSelect('user.userOrganisations', 'userOrganisations')
        .leftJoin('userOrganisations.organisation', 'organisation')
        .leftJoinAndSelect('userOrganisations.userOrganisationUnits', 'userOrganisationUnits')
        .leftJoin('userOrganisationUnits.organisationUnit', 'organisationUnit')
        .andWhere('roleOrganisationUnit.id = :organisationUnitId AND organisationUnit.id = :organisationUnitId', { organisationUnitId: filters.organisationUnitId });
    }

    if (filters.onlyActive) {
      query.andWhere('user.lockedAt IS NULL');
    }

    query
      .skip(pagination.skip)
      .take(pagination.take);

    for (const [key, order] of Object.entries(pagination.order)) {
      let field: string;
      switch (key) {
        case 'createdAt': field = 'user.createdAt'; break;
        default:
          field = 'user.createdAt'; break;
      }
      query.addOrderBy(field, order);
    }

    // Get users from database
    const [dbUsers, count] = await query.getManyAndCount();
    const identityUsers = await this.identityProviderService.getUsersList(dbUsers.map(items => items.identityId));

    const users = await Promise.all(dbUsers.map(async (dbUser) => {

      const identityUser = identityUsers.find(item => item.identityId === dbUser.identityId);
      if (!identityUser) {
        throw new NotFoundError(UserErrorsEnum.USER_IDENTITY_PROVIDER_NOT_FOUND, { details: { context: 'S.DU.gUL' } });
      }

      return {
        id: dbUser.id,
        isActive: !dbUser.lockedAt,
        roles: dbUser.serviceRoles,
        name: identityUser.displayName ?? 'N/A',
        lockedAt: dbUser.lockedAt,
        ...(fieldSet.has('email') ? { email: identityUser?.email ?? 'N/A' } : {}),
        ...(filters.organisationUnitId ? {
          organisationUnitUserId: (await dbUser.userOrganisations)[0]?.userOrganisationUnits[0]?.id ?? ''
        } : {})
      }
    }));

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
      contactByPhone: boolean,
      contactByEmail: boolean,
      contactByPhoneTimeframe: PhoneUserPreferenceEnum | null,
      contactDetails: string | null,
    },
    entityManager?: EntityManager
  ): Promise<void> {

    const connection = entityManager ?? this.sqlConnection.manager;

    const userPreferences = await connection.createQueryBuilder(UserPreferenceEntity, 'preference').where('preference.user = :userId', { userId: userId }).getOne();
    let preference: {
      user: {
        id: string,
      },
      contactByPhone: boolean,
      contactByEmail: boolean,
      contactByPhoneTimeframe: PhoneUserPreferenceEnum | null,
      contactDetails: string | null,
      createdBy: string,
      updatedBy: string,
      id?: string
    } = {
      user: { id: userId },
      createdBy: userId,  // this is only for the first time as BaseEntity defines it as update: false
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

  async getCollaborationsInvitesList(email: string, status: InnovationCollaboratorStatusEnum = InnovationCollaboratorStatusEnum.PENDING): Promise<{
    id: string,
    invitedAt: string
    innovation: {
      id: string,
      name: string
    }
  }[]> {

    const invites = await this.sqlConnection.createQueryBuilder(InnovationCollaboratorEntity, 'collaborator')
      .select([
        'collaborator.id', 'collaborator.invitedAt',
        'innovation.id', 'innovation.name'
      ])
      .innerJoin('collaborator.innovation', 'innovation')
      .where('collaborator.email = :email', { email })
      .andWhere('collaborator.status = :status', { status: status })
      .andWhere('DATEDIFF(day, collaborator.invitedAt, GETDATE()) < 31')
      .getMany();

    const data = invites.map((invite) => ({
      id: invite.id,
      invitedAt: invite.invitedAt,
      innovation: {
        id: invite.innovation.id,
        name: invite.innovation.name
      }
    }));

    return data;
  }
}
