import type { DataSource, Repository } from 'typeorm';

import { UserEntity, UserPreferenceEntity } from '../../entities';
import type { PhoneUserPreferenceEnum, UserTypeEnum } from '../../enums';
import { InternalServerError, NotFoundError, UserErrorsEnum } from '../../errors';
import type { DateISOType, DomainUserInfoType } from '../../types';

import type { IdentityProviderServiceType } from '../interfaces';


export class DomainUsersService {

  userRepository: Repository<UserEntity>;

  constructor(
    private sqlConnection: DataSource,
    private identityProviderService: IdentityProviderServiceType
  ) {
    this.userRepository = this.sqlConnection.getRepository(UserEntity);
  }


  async getUserInfo(data: { userId?: string, identityId?: string }): Promise<DomainUserInfoType> {

    if (!data.userId && !data.identityId) {
      throw new InternalServerError(UserErrorsEnum.USER_INFO_EMPTY_INPUT);
    }

    const query = this.userRepository.createQueryBuilder('user')
      .leftJoinAndSelect('user.userOrganisations', 'userOrganisations')
      .leftJoinAndSelect('userOrganisations.organisation', 'organisation')
      .leftJoinAndSelect('userOrganisations.userOrganisationUnits', 'userOrganisationUnits')
      .leftJoinAndSelect('userOrganisationUnits.organisationUnit', 'organisationUnit')
      .leftJoinAndSelect('user.serviceRoles', 'serviceRoles')
      .leftJoinAndSelect('serviceRoles.role', 'role');

    if (data.userId) { query.where('user.id = :userId', { userId: data.userId }); }
    else if (data.identityId) { query.where('user.external_id = :identityId', { identityId: data.identityId }); }

    const dbUser = await query.getOne();

    if (!dbUser) {
      throw new NotFoundError(UserErrorsEnum.USER_SQL_NOT_FOUND);
    }

    const authUser = await this.identityProviderService.getUserInfo(dbUser.identityId);

    return {
      id: dbUser.id,
      identityId: authUser.identityId,
      email: authUser.email,
      displayName: authUser.displayName,
      type: dbUser.type,
      roles: dbUser.serviceRoles.map(item => item.role.name),
      phone: authUser.mobilePhone,
      isActive: !dbUser.lockedAt,
      passwordResetAt: authUser.passwordResetAt,
      firstTimeSignInAt: dbUser.firstTimeSignInAt,
      surveyId: dbUser.surveyId,
      organisations: (await dbUser.userOrganisations).map(userOrganisation => {

        const organisation = userOrganisation.organisation;
        const organisationUnits = userOrganisation.userOrganisationUnits;

        return {
          id: organisation.id,
          name: organisation.name,
          size: organisation.size,
          role: userOrganisation.role,
          isShadow: organisation.isShadow,
          organisationUnits: organisationUnits.map(item => ({
            id: item.organisationUnit.id,
            acronym: item.organisationUnit.acronym,
            name: item.organisationUnit.name
          }))
        }

      })
    };

  }

  async getUsersList(data: { userIds?: string[], identityIds?: string[] }): Promise<{
    id: string,
    identityId: string,
    displayName: string,
    email: string,
    mobilePhone: null | string,
    type: UserTypeEnum
    isActive: boolean,
    lastLoginAt: null | DateISOType
  }[]> {
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

    const query = this.userRepository.createQueryBuilder('users');
    if (data.userIds) { query.where('id IN (:...userIds)', { userIds: data.userIds }); }
    else if (data.identityIds) { query.where('external_id IN (:...identityIds)', { identityIds: data.identityIds }); }

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
        email: identityUser.email,
        mobilePhone: identityUser.mobilePhone,
        type: dbUser.type,
        isActive: !dbUser.lockedAt,
        lastLoginAt: identityUser.lastLoginAt, 
      };

    });

  }

  async getUserPreferences(userId: string): Promise<{
    contactByPhone: boolean,
    contactByEmail:  boolean,
    contactByPhoneTimeframe: null | PhoneUserPreferenceEnum,
    contactDetails: null | string,
  }> {
    
    const userPreferences = await this.sqlConnection.createQueryBuilder(UserPreferenceEntity, 'preference').where('preference.user = :userId', { userId: userId }).getOne();
    
    return {
      contactByPhone: userPreferences?.contactByPhone ?? false,
      contactByEmail: userPreferences?.contactByEmail ?? false,
      contactByPhoneTimeframe: userPreferences?.contactByPhoneTimeframe ?? null,
      contactDetails: userPreferences?.contactDetails ?? null,
    };
  }

}
