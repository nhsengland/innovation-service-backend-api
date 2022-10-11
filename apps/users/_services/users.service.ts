import { injectable, inject } from 'inversify';
import { In, Repository } from 'typeorm';

import {
  DomainServiceSymbol, DomainServiceType,
  IdentityProviderServiceSymbol, IdentityProviderServiceType,
} from '@users/shared/services';

import {
  UserTypeEnum,
} from '@users/shared/enums';

import {
  UserEntity, OrganisationEntity, OrganisationUnitUserEntity, InnovationEntity,
} from '@users/shared/entities';

import {
  NotFoundError, UserErrorsEnum,
} from '@users/shared/errors';

import { BaseAppService } from './base-app.service';
import type { DomainUserInfoType } from '@users/shared/types';


@injectable()
export class UsersService extends BaseAppService {

  userRepository: Repository<UserEntity>;
  organisationRepository: Repository<OrganisationEntity>;
  organisationUnitUserRepository: Repository<OrganisationUnitUserEntity>;
  innovationRepository: Repository<InnovationEntity>;

  constructor(
    @inject(DomainServiceSymbol) private domainService: DomainServiceType,
    @inject(IdentityProviderServiceSymbol) private identityProviderService: IdentityProviderServiceType
  ) {
    super();

    this.userRepository = this.sqlConnection.getRepository<UserEntity>(UserEntity);
    this.organisationRepository = this.sqlConnection.getRepository<OrganisationEntity>(OrganisationEntity);
    this.organisationUnitUserRepository = this.sqlConnection.getRepository<OrganisationUnitUserEntity>(OrganisationUnitUserEntity);
    this.innovationRepository = this.sqlConnection.getRepository<InnovationEntity>(InnovationEntity);
  }


  async getUserByEmail(email: string, filters: { userTypes: UserTypeEnum[] }): Promise<DomainUserInfoType[]> {

    try {

      const authUser = await this.identityProviderService.getUserInfoByEmail(email);
      if (!authUser) {
        throw new NotFoundError(UserErrorsEnum.USER_IDENTITY_PROVIDER_NOT_FOUND);
      }

      const dbUser = await this.domainService.users.getUserInfo({ identityId: authUser.identityId });

      // Apply filters.
      if (filters.userTypes.length === 0 || (filters.userTypes.length > 0 && filters.userTypes.includes(dbUser.type))) {
        return [dbUser];
      } else {
        throw new NotFoundError(UserErrorsEnum.USER_SQL_NOT_FOUND);
      }

    } catch (error) {
      // As this method mimics a search, on errors, we just return an empty array.
      return [];
    }

  }

  async getOrganisationUnitAccessors(organisationUnit: string): Promise<{
    id: string,
    organisationUnitUserId: string,
    name: string,
    email: string,
    type: UserTypeEnum,
    isActive: boolean
  }[]> {

    // Get all users from the organisation unit.
    const organisationUnitUsers = await this.organisationUnitUserRepository.find({
      relations: ['organisationUser', 'organisationUser.user'],
      where: { organisationUnit: In([organisationUnit]) }
    });

    // If 0 users, no more work need to be done!
    if (organisationUnitUsers.length === 0) {
      return [];
    }

    const userIds = organisationUnitUsers.map(item => item.organisationUser.user.id);
    const authUsers = await this.domainService.users.getUsersList({ userIds });

    return this.organisationUserReducer(organisationUnitUsers, authUsers);

  }

  private organisationUserReducer(organisationUnitUsers: OrganisationUnitUserEntity[], authUsers: { id: string; identityId: string; email: string; displayName: string; type: UserTypeEnum; isActive: boolean; }[]): { id: string; organisationUnitUserId: string; name: string; email: string; type: UserTypeEnum; isActive: boolean; }[] | PromiseLike<{ id: string; organisationUnitUserId: string; name: string; email: string; type: UserTypeEnum; isActive: boolean; }[]> {
    return organisationUnitUsers.reduce((acc: { id: string; organisationUnitUserId: string; name: string; email: string; type: UserTypeEnum; isActive: boolean; }[], organisationUnitUser) => {

      const dbUser: UserEntity /** TODO: Remove this type initializer */ = organisationUnitUser.organisationUser.user;
      const authUser = authUsers.find(item => ((item.id === dbUser.id) && item.isActive));

      if (authUser) { // Filters by existing AND active users on Identity provider.
        return [
          ...acc,
          ...[{
            id: dbUser.id,
            organisationUnitUserId: organisationUnitUser.id,
            name: authUser.displayName,
            type: dbUser.type,
            email: authUser.email,
            isActive: authUser.isActive
          }]
        ];
      } else {
        return acc;
      }

    }, []);
  }

  async updateUserInfo(
    user: { id: string, identityId: string, type: UserTypeEnum, firstTimeSignInAt?: Date | null },
    data: {
      displayName: string,
      mobilePhone?: string | undefined,
      organisation?: { id: string; isShadow: boolean; name?: string; size?: string; } | undefined
    }
  ): Promise<{ id: string }> {

    await this.identityProviderService.updateUser(user.identityId, {
      displayName: data.displayName,
      ...(data.mobilePhone ? { mobilePhone: data.mobilePhone } : {})
    });

    // NOTE: Only innovators can change their organisation, we make a sanity check here.
    if (user.type === UserTypeEnum.INNOVATOR) {

      if (data.organisation) {
        const organisationData: { isShadow: boolean, name?: string, size?: null | string } = {
          isShadow: data.organisation.isShadow
        };

        if (organisationData.isShadow) {
          organisationData.name = user.id;
          organisationData.size = null;
        } else {
          if (data.organisation.name) { organisationData.name = data.organisation.name; }
          if (data.organisation.size) { organisationData.size = data.organisation.size; }
        }

        await this.organisationRepository.update(data.organisation.id, organisationData);
      }

      // if user does not have firstTimeSignInAt with a date, it means this is the first time the user is signing in
      // Updates the firstTimeSignInAt with the current date.
      if (!user.firstTimeSignInAt) {
        await this.userRepository.update(user.id, { firstTimeSignInAt: new Date() })
      }

    }

    return { id: user.id };
  }

  async deleteUserInfo(userId: string, reason?: string): Promise<{ id: string }> {

    const result = await this.sqlConnection.transaction(async transactionManager => {

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

      user.deletedAt = new Date();
      user.deleteReason = reason || '';

      return transactionManager.save(user);

    });

    return {
      id: result.id,
    }
  }

}
