import { inject, injectable } from 'inversify';
import type { Repository } from 'typeorm';

import { InnovationTransferEntity, OrganisationEntity, OrganisationUserEntity, TermsOfUseEntity, TermsOfUseUserEntity, UserEntity } from '@users/shared/entities';
import { AccessorOrganisationRoleEnum, InnovationTransferStatusEnum, InnovatorOrganisationRoleEnum, NotifierTypeEnum, OrganisationTypeEnum, TermsOfUseTypeEnum, UserTypeEnum } from '@users/shared/enums';
import { GenericErrorsEnum, NotFoundError, UnprocessableEntityError, UserErrorsEnum } from '@users/shared/errors';
import { CacheServiceSymbol, CacheServiceType, DomainServiceSymbol, DomainServiceType, IdentityProviderServiceSymbol, IdentityProviderServiceType, NotifierServiceSymbol, NotifierServiceType } from '@users/shared/services';
import type { DateISOType, DomainUserInfoType } from '@users/shared/types';

import { InternalServerError } from '@users/shared/errors/errors.config';
import type { CacheConfigType } from '@users/shared/services/storage/cache.service';
import { BaseService } from './base.service';


@injectable()
export class UsersService extends BaseService {

  userRepository: Repository<UserEntity>;
  organisationRepository: Repository<OrganisationEntity>;
  private cache: CacheConfigType['IdentityUserInfo']

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

  async createUserInnovator(user: { identityId: string }, data: { surveyId: null | string }): Promise<{ id: string }> {

    const authUser = await this.identityProviderService.getUserInfo(user.identityId);
    if (!authUser) {
      throw new UnprocessableEntityError(UserErrorsEnum.USER_IDENTITY_PROVIDER_NOT_FOUND);
    }

    const identityIdExists = !!(await this.sqlConnection.createQueryBuilder(UserEntity, 'users').where('external_id = :userId', { userId: authUser.identityId }).getCount());
    if (identityIdExists) {
      throw new UnprocessableEntityError(UserErrorsEnum.USER_ALREADY_EXISTS);
    }


    return this.sqlConnection.transaction(async transactionManager => {

      const dbUser = await transactionManager.save(UserEntity.new({
        identityId: user.identityId,
        surveyId: data.surveyId,
        type: UserTypeEnum.INNOVATOR
      }));

      // Creates default organisation.
      const dbOrganisation = await transactionManager.save(OrganisationEntity.new({
        name: user.identityId,
        acronym: null,
        type: OrganisationTypeEnum.INNOVATOR,
        size: null,
        isShadow: true,
        createdBy: dbUser.id,
        updatedBy: dbUser.id
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

      await this.notifierService.send<NotifierTypeEnum.INNOVATOR_ACCOUNT_CREATION>(
        { id: dbUser.id, identityId: dbUser.identityId, type: dbUser.type },
        NotifierTypeEnum.INNOVATOR_ACCOUNT_CREATION,
        {}
      );

      return { id: dbUser.id };

    });

  }


  async updateUserInfo(
    user: { id: string, identityId: string, type: UserTypeEnum, firstTimeSignInAt?: null | DateISOType },
    data: {
      displayName: string,
      mobilePhone?: string | null,
      organisation?: { id: string, isShadow: boolean, name?: null | string, size?: null | string }
    }
  ): Promise<{ id: string }> {

    await this.identityProviderService.updateUser(user.identityId, {
      displayName: data.displayName,
      ...(data.mobilePhone !== undefined ? { mobilePhone: data.mobilePhone } : {})
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
          organisationData.name = user.identityId;
          organisationData.size = null;
        } else {
          if (data.organisation.name) { organisationData.name = data.organisation.name; }
          if (data.organisation.size) { organisationData.size = data.organisation.size; }
        }

        await this.organisationRepository.update(data.organisation.id, organisationData);

      }

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

      return { id: result.id }

    });

  }

  /**
   * gets the users list for the give user types crossing information between the identity provider and the database
   * @param userTypes array of user types to retrieve
   * @param fields extra fields to return
   * @returns user object with extra selected fields
   */
  async getUserList(
    filters: {userTypes: UserTypeEnum[], organisationUnitId?: string}, 
    fields: ('organisations' | 'units')[]
  ): Promise<{
    id: string,
    email: string,
    isActive: boolean,
    name: string,
    type: UserTypeEnum,
    organisations?: {
      name: string,
      role: InnovatorOrganisationRoleEnum | AccessorOrganisationRoleEnum
      units?: {name: string, organisationUnitUserId: string}[]
    }[]
  }[]>{
    // [TechDebt]: add pagination if this gets used outside of admin bulk export, other cases always have narrower conditions
    const query = this.sqlConnection.createQueryBuilder(UserEntity, 'user');
    const fieldSet = new Set(fields);

    // Relations
    if(fieldSet.has('organisations') || fieldSet.has('units') || filters.organisationUnitId){
      query.leftJoinAndSelect('user.userOrganisations', 'userOrganisations')
        .leftJoinAndSelect('userOrganisations.organisation', 'organisation')

      if(fieldSet.has('units') || filters.organisationUnitId) {
        query.leftJoinAndSelect('userOrganisations.userOrganisationUnits', 'userOrganisationUnits')
          .leftJoinAndSelect('userOrganisationUnits.organisationUnit', 'organisationUnit');
      }
    }

    // Filters
    if(filters.userTypes.length > 0) {
      query.andWhere('user.type IN (:...userTypes)', { userTypes: filters.userTypes })
    }
    if(filters.organisationUnitId) {
      query.andWhere('organisationUnit.id = :organisationUnitId', { organisationUnitId: filters.organisationUnitId })
    }

    // Get users from database
    const usersFromSQL = await query.getMany()
    const usersMap = new Map((await Promise.all(usersFromSQL.map(async user => {
      let organisations = undefined;
      if(fieldSet.has('organisations') || fieldSet.has('units')){
        const userOrganisations = await user.userOrganisations;
        organisations = userOrganisations.map(o => ({
          name: o.organisation.name,
          role: o.role,
          ...(fieldSet.has('units') ? {units: o.userOrganisationUnits.map(u => ({name: u.organisationUnit.name, organisationUnitUserId: u.id}))} : {})
        }))
      }
        
      return {
        id: user.id,
        externalId: user.identityId,
        type: user.type,
        organisations: organisations
      };
    })
    )).map(user => [user.externalId, user]));

    // Get users from identity provider
    const users = (await this.domainService.users.getUsersList({identityIds: [...usersMap.keys()]}))
      .map(user => {
        const dbUser = usersMap.get(user.identityId);
        if(!dbUser) {
          throw new InternalServerError(GenericErrorsEnum.UNKNOWN_ERROR, {message: `domainService returned user not found in db ${user.identityId}`});
        }
        return {
          id: dbUser.id,
          email: user.email,
          isActive: user.isActive,
          name: user.displayName,
          type: dbUser.type,
          ...(dbUser.organisations ? {organisations: dbUser.organisations} : {})
        } 
      });

    return users;
  }

}
