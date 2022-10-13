import { inject, injectable } from 'inversify';
import type { Repository } from 'typeorm';

import { UserTypeEnum } from '../../enums';
import { UserEntity } from '../../entities';
import { InternalServerError, NotFoundError, GenericErrorsEnum, UserErrorsEnum } from '../../errors';
import type { DomainUserInfoType } from '../../types';

import { IdentityProviderServiceSymbol, IdentityProviderServiceType, SQLConnectionServiceSymbol, SQLConnectionServiceType } from '../interfaces';


@injectable()
export class DomainUsersService {

  userRepository: Repository<UserEntity>;

  constructor(
    @inject(SQLConnectionServiceSymbol) private sqlConnectionService: SQLConnectionServiceType,
    @inject(IdentityProviderServiceSymbol) private identityProviderService: IdentityProviderServiceType
  ) {

    const sqlConnection = this.sqlConnectionService.getConnection();
    this.userRepository = sqlConnection.getRepository(UserEntity);
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
      .leftJoinAndSelect('serviceRoles.role', 'role')
      .leftJoinAndSelect('user.termsOfUseUser', 'termsOfUseUser', 'accepted_at IS NULL')

    if (data.userId) { query.where('user.id = :userId', { userId: data.userId }); }
    else if (data.identityId) { query.where('user.external_id = :identityId', { identityId: data.identityId }); }

    const dbUser = await query.getOne();

    if (!dbUser) {
      throw new NotFoundError(UserErrorsEnum.USER_SQL_NOT_FOUND);
    }

    const authUser = await this.identityProviderService.getUserInfo(dbUser.identityId);

    try {

      const userOrganisations = await dbUser.userOrganisations;
      const termsOfUseAccepted = UserTypeEnum.ADMIN ? true : (await dbUser.termsOfUseUser).length === 0;

      return {
        id: dbUser.id,
        identityId: authUser.identityId,
        email: authUser.email,
        displayName: authUser.displayName,
        type: dbUser.type,
        roles: dbUser.serviceRoles.map(item => item.role.name),
        phone: authUser.phone,
        isActive: !dbUser.lockedAt,
        termsOfUseAccepted,
        passwordResetAt: authUser.passwordResetAt,
        firstTimeSignInAt: dbUser.firstTimeSignInAt,
        surveyId: dbUser.surveyId,
        organisations: userOrganisations.map(userOrganisation => {

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

    } catch (error) {
      throw new InternalServerError(GenericErrorsEnum.UNKNOWN_ERROR);
    }

  }

  async getUsersList(data: { userIds?: string[], identityIds?: string[] }): Promise<{
    id: string,
    identityId: string,
    email: string,
    displayName: string,
    type: UserTypeEnum
    isActive: boolean
  }[]> {

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
        email: identityUser.email,
        displayName: identityUser.displayName,
        type: dbUser.type,
        isActive: !dbUser.lockedAt
      };

    });

  }

}
