import { injectable, inject } from 'inversify';
import type { Repository } from 'typeorm';

import { InnovationTransferStatusEnum, TermsOfUseTypeEnum, UserTypeEnum } from '@users/shared/enums';
import { UserEntity, OrganisationEntity, OrganisationUnitUserEntity, InnovationTransferEntity, TermsOfUseEntity, TermsOfUseUserEntity } from '@users/shared/entities';
import { NotFoundError, UserErrorsEnum } from '@users/shared/errors';
import { DomainServiceSymbol, DomainServiceType, IdentityProviderServiceSymbol, IdentityProviderServiceType } from '@users/shared/services';
import type { DateISOType, DomainUserInfoType } from '@users/shared/types';

import { BaseAppService } from './base-app.service';


@injectable()
export class UsersService extends BaseAppService {

  userRepository: Repository<UserEntity>;
  organisationRepository: Repository<OrganisationEntity>;
  organisationUnitUserRepository: Repository<OrganisationUnitUserEntity>;


  constructor(
    @inject(DomainServiceSymbol) private domainService: DomainServiceType,
    @inject(IdentityProviderServiceSymbol) private identityProviderService: IdentityProviderServiceType
  ) {
    super();
    this.userRepository = this.sqlConnection.getRepository<UserEntity>(UserEntity);
    this.organisationRepository = this.sqlConnection.getRepository<OrganisationEntity>(OrganisationEntity);
    this.organisationUnitUserRepository = this.sqlConnection.getRepository<OrganisationUnitUserEntity>(OrganisationUnitUserEntity);
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

  async createUserInnovator(
    user: { identityId: string },
    data: { surveyId: string }
  ): Promise<{ id: string }> {

    return this.sqlConnection.transaction(async transactionManager => {

      const dbUser = await transactionManager.save(UserEntity.new({
        identityId: user.identityId,
        surveyId: data.surveyId,
        type: UserTypeEnum.INNOVATOR
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
          acceptedAt: new Date().toISOString()
        }));
      }

      return { id: dbUser.id };

    });

  }


  async updateUserInfo(
    user: { id: string, identityId: string, type: UserTypeEnum, firstTimeSignInAt?: null | DateISOType },
    data: {
      displayName: string,
      mobilePhone?: string,
      organisation?: { id: string; isShadow: boolean; name?: string; size?: string; }
    }
  ): Promise<{ id: string }> {

    await this.identityProviderService.updateUser(user.identityId, {
      displayName: data.displayName,
      ...(data.mobilePhone ? { mobilePhone: data.mobilePhone } : {})
    });

    // NOTE: Only innovators can change their organisation, we make a sanity check here.
    if (user.type === UserTypeEnum.INNOVATOR) {

      // If user does not have firstTimeSignInAt, it means this is the first time the user is signing in
      // Updates the firstTimeSignInAt with the current date.
      if (!user.firstTimeSignInAt) {
        await this.userRepository.update(user.id, { firstTimeSignInAt: new Date().toISOString() })
      }

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

    }

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

      return { id: result.id }

    });

  }

}
