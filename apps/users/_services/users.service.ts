import { inject, injectable } from 'inversify';
import type { Repository } from 'typeorm';

import { InnovationTransferEntity, OrganisationEntity, OrganisationUserEntity, TermsOfUseEntity, TermsOfUseUserEntity, UserEntity, UserPreferenceEntity } from '@users/shared/entities';
import { AccessorOrganisationRoleEnum, InnovationTransferStatusEnum, InnovatorOrganisationRoleEnum, NotifierTypeEnum, OrganisationTypeEnum, PhoneUserPreferenceEnum, ServiceRoleEnum, TermsOfUseTypeEnum } from '@users/shared/enums';
import { NotFoundError, UnprocessableEntityError, UserErrorsEnum } from '@users/shared/errors';
import { CacheServiceSymbol, CacheServiceType, DomainServiceSymbol, DomainServiceType, IdentityProviderServiceSymbol, IdentityProviderServiceType, NotifierServiceSymbol, NotifierServiceType } from '@users/shared/services';
import type { CacheConfigType } from '@users/shared/services/storage/cache.service';
import type { DateISOType, DomainUserInfoType } from '@users/shared/types';

import { UserRoleEntity } from '@users/shared/entities';
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


  async getUserByEmail(email: string, filters: { userRoles: ServiceRoleEnum[] }): Promise<DomainUserInfoType[]> {

    try {

      const authUser = await this.identityProviderService.getUserInfoByEmail(email);
      if (!authUser) {
        throw new NotFoundError(UserErrorsEnum.USER_IDENTITY_PROVIDER_NOT_FOUND);
      }

      const dbUser = await this.domainService.users.getUserInfo({ identityId: authUser.identityId });

      // Apply filters.
      if (filters.userRoles.length === 0 || (filters.userRoles.length > 0 && filters.userRoles.some(userRole => dbUser.roles.map(r => r.role).includes(userRole)))) {
        return [dbUser];
      } else {
        throw new NotFoundError(UserErrorsEnum.USER_SQL_NOT_FOUND);
      }

    } catch (error) {
      // As this method mimics a search, on errors, we just return an empty array.
      return [];
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

      // add innovator role

      const userRole = await transactionManager.save(UserRoleEntity, UserRoleEntity.new({ user: dbUser, role: ServiceRoleEnum.INNOVATOR }));

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
          organisation:{
            id: dbOrganisation.id,
            isShadow: dbOrganisation.isShadow,
            name: dbOrganisation.name,
            size: dbOrganisation.size,
            acronym: dbOrganisation.acronym,
            role: InnovatorOrganisationRoleEnum.INNOVATOR_OWNER,
          },
          currentRole: { id: userRole.id, role: ServiceRoleEnum.INNOVATOR},

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
      organisation?: { id: string, isShadow: boolean, name?: null | string, size?: null | string }
    }
  ): Promise<{ id: string }> {

    await this.identityProviderService.updateUser(user.identityId, {
      displayName: data.displayName,
      ...(data.mobilePhone !== undefined ? { mobilePhone: data.mobilePhone } : {})
    });

    // NOTE: Only innovators can change their organisation, we make a sanity check here.
    if (currentRole === ServiceRoleEnum.INNOVATOR) {

      // If user does not have firstTimeSignInAt, it means this is the first time the user is signing in
      // Updates the firstTimeSignInAt with the current date.
      if (!user.firstTimeSignInAt) {
        await this.userRepository.update(user.id, { firstTimeSignInAt: new Date().toISOString() });
      }

      if (data.organisation) {

        const organisationData: { isShadow: boolean, name?: string, size?: null | string } = {
          isShadow: data.organisation.isShadow
        };

        if (organisationData.isShadow) {
          organisationData.name = user.identityId;
          organisationData.size = null;
        } else {
          if (data.organisation.name) { organisationData.name = data.organisation.name; }
          if (data.organisation.size) { organisationData.size = data.organisation.size; }
        }

        await this.organisationRepository.update(data.organisation.id, organisationData);

      }

      const preferences: { contactByPhone: boolean, contactByEmail: boolean, contactByPhoneTimeframe: null | PhoneUserPreferenceEnum, contactDetails: null | string } = {
        contactByPhone: data.contactByPhone as boolean,
        contactByEmail: data.contactByEmail as boolean,
        contactByPhoneTimeframe: data.contactByPhoneTimeframe  ?? null,
        contactDetails: data.contactDetails ?? null
      };

      await this.upsertUserPreferences(user.id, preferences);
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
    fields: ('organisations' | 'units')[]
  ): Promise<{
    id: string,
    email: string,
    isActive: boolean,
    name: string,
    roles: UserRoleEntity[],
    organisations?: {
      name: string,
      role: InnovatorOrganisationRoleEnum | AccessorOrganisationRoleEnum
      units?: { name: string, organisationUnitUserId: string }[]
    }[]
  }[]> {
    // [TechDebt]: add pagination if this gets used outside of admin bulk export, other cases always have narrower conditions
    const query = this.sqlConnection.createQueryBuilder(UserEntity, 'user');
    const fieldSet = new Set(fields);

    // Relations
    if (fieldSet.has('organisations') || fieldSet.has('units') || filters.organisationUnitId) {
      query.leftJoinAndSelect('user.userOrganisations', 'userOrganisations')
        .leftJoinAndSelect('userOrganisations.organisation', 'organisation');

      if (fieldSet.has('units') || filters.organisationUnitId) {
        query.leftJoinAndSelect('userOrganisations.userOrganisationUnits', 'userOrganisationUnits')
          .leftJoinAndSelect('userOrganisationUnits.organisationUnit', 'organisationUnit');
      }
    }

    // Filters
    if (filters.userTypes.length > 0) {
      query.leftJoinAndSelect('user.serviceRoles', 'serviceRoles');
      query.andWhere('serviceRoles.role IN (:...userRoles)', { userRoles: filters.userTypes });
    }
    if (filters.organisationUnitId) {
      query.andWhere('organisationUnit.id = :organisationUnitId', { organisationUnitId: filters.organisationUnitId });
    }

    if (filters.onlyActive) {
      query.andWhere('user.lockedAt IS NULL');
    }
    
    // Get users from database
    const usersFromSQL = await query.getMany();

    const identityUsers = (await this.identityProviderService.getUsersList(usersFromSQL.map(u => u.identityId)));
      

    return Promise.all(usersFromSQL.map(async user => {
      let organisations: {
        name: string,
        role: InnovatorOrganisationRoleEnum | AccessorOrganisationRoleEnum
        units?: { name: string, organisationUnitUserId: string }[]
      }[] | undefined = undefined;

      if (fieldSet.has('organisations') || fieldSet.has('units')) {
        const userOrganisations = await user.userOrganisations;
        organisations = userOrganisations.map(o => ({
          name: o.organisation.name,
          role: o.role,
          ...(fieldSet.has('units') ? { units: o.userOrganisationUnits.map(u => ({ name: u.organisationUnit.name, organisationUnitUserId: u.id })) } : {})
        }));
      }

      const b2cUser = identityUsers.find(item => item.identityId === user.identityId);
      if (!b2cUser) {
        throw new NotFoundError(UserErrorsEnum.USER_IDENTITY_PROVIDER_NOT_FOUND);
      }

      return {
        id: user.id,
        email: b2cUser.email,
        isActive: !user.lockedAt,
        roles: user.serviceRoles,
        name: b2cUser.displayName,
        ...(organisations ? { organisations } : {}),
      };

    }));
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
      contactByEmail:  boolean,
      contactByPhoneTimeframe: PhoneUserPreferenceEnum | null,
      contactDetails: string | null,
    }
  ) : Promise<void> {

    const userPreferences = await this.sqlConnection.createQueryBuilder(UserPreferenceEntity, 'preference').where('preference.user = :userId', { userId: userId }).getOne();
    let preference: {
      user: {
        id: string,
      },
      contactByPhone: boolean,
      contactByEmail:  boolean,
      contactByPhoneTimeframe: PhoneUserPreferenceEnum | null,
      contactDetails: string | null,
      createdBy: string,
      updatedBy: string,
      id?: string
    } = {
      user: {id: userId},
      createdBy: userId,  // this is only for the first time as BaseEntity defines it as update: false
      updatedBy: userId,
      ...preferences
    };

    if(userPreferences) {
      preference = {
        id: userPreferences.id,
        ...preference
      };

    }

    await this.sqlConnection.manager.save(UserPreferenceEntity, preference);
  }
}
