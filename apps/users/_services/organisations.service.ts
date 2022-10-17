import { inject, injectable } from 'inversify';
import { In, Repository } from 'typeorm';

import { OrganisationEntity, OrganisationUnitUserEntity } from '@users/shared/entities';
import { OrganisationTypeEnum, UserTypeEnum } from '@users/shared/enums';
import { GenericErrorsEnum, InternalServerError } from '@users/shared/errors';
import { DomainServiceSymbol, DomainServiceType } from '@users/shared/services';

import { BaseService } from './base.service';


@injectable()
export class OrganisationsService extends BaseService {

  organisationRepository: Repository<OrganisationEntity>;
  organisationUnitUserRepository: Repository<OrganisationUnitUserEntity>;

  constructor(
    @inject(DomainServiceSymbol) private domainService: DomainServiceType,
  ) {
    super();
    this.organisationRepository = this.sqlConnection.getRepository<OrganisationEntity>(OrganisationEntity);
    this.organisationUnitUserRepository = this.sqlConnection.getRepository<OrganisationUnitUserEntity>(OrganisationUnitUserEntity);
  }


  async getOrganisationsList(): Promise<{ id: string, name: string, acronym: string }[]> {

    try {

      const dbOrganisations = await this.organisationRepository
        .createQueryBuilder('organisation')
        .where('organisation.type = :type', { type: OrganisationTypeEnum.ACCESSOR })
        .orderBy('organisation.name', 'ASC')
        .getMany();

      return dbOrganisations.map(organisation => ({
        id: organisation.id,
        name: organisation.name,
        acronym: organisation.acronym
      }));

    } catch (error) {
      throw new InternalServerError(GenericErrorsEnum.UNKNOWN_ERROR);
    }

  }


  async getOrganisationsWithUnitsList(): Promise<{
    id: string, name: string, acronym: string,
    organisationUnits: { id: string; name: string; acronym: string; }[]
  }[]> {

    try {

      const dbOrganisations = await this.organisationRepository
        .createQueryBuilder('organisation')
        .leftJoinAndSelect('organisation.organisationUnits', 'organisationUnits')
        .where('organisation.type = :type', { type: OrganisationTypeEnum.ACCESSOR })
        .orderBy('organisation.name', 'ASC')
        .getMany();

      return Promise.all(
        dbOrganisations.map(async organisation => ({
          id: organisation.id,
          name: organisation.name,
          acronym: organisation.acronym,
          organisationUnits: (await organisation.organisationUnits).map(organisationUnit => ({
            id: organisationUnit.id,
            name: organisationUnit.name,
            acronym: organisationUnit.acronym,
          }))
        }))
      );

    } catch (error) {
      throw new InternalServerError(GenericErrorsEnum.UNKNOWN_ERROR);
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

    return organisationUnitUsers.reduce((acc: { id: string; organisationUnitUserId: string; name: string; email: string; type: UserTypeEnum; isActive: boolean; }[], organisationUnitUser) => {

      const dbUser = organisationUnitUser.organisationUser.user;
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

}
