import { inject, injectable } from 'inversify';

import { OrganisationEntity, OrganisationUnitUserEntity } from '@users/shared/entities';
import { OrganisationTypeEnum } from '@users/shared/enums';
import { GenericErrorsEnum, InternalServerError } from '@users/shared/errors';
import { DomainServiceSymbol, DomainServiceType } from '@users/shared/services';

import { BaseService } from './base.service';


@injectable()
export class OrganisationsService extends BaseService {

  constructor(
    @inject(DomainServiceSymbol) private domainService: DomainServiceType
  ) { super(); }


  async getOrganisationsList(): Promise<{ id: string, name: string, acronym: string }[]> {

    try {

      const dbOrganisations = await this.sqlConnection.createQueryBuilder(OrganisationEntity, 'organisation')
        .where('organisation.type = :type AND organisation.inactivated_at IS NULL', { type: OrganisationTypeEnum.ACCESSOR })
        .orderBy('organisation.name', 'ASC')
        .getMany();

      return dbOrganisations.map(organisation => ({
        id: organisation.id,
        name: organisation.name,
        acronym: organisation.acronym ?? ''
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

      const dbOrganisations = await this.sqlConnection.createQueryBuilder(OrganisationEntity, 'organisation')
        .innerJoinAndSelect('organisation.organisationUnits', 'organisationUnits')
        .where('organisation.type = :type AND organisation.inactivated_at IS NULL', { type: OrganisationTypeEnum.ACCESSOR })
        .andWhere('organisationUnits.inactivated_at IS NULL')
        .orderBy('organisation.name', 'ASC')
        .getMany();

      return Promise.all(
        dbOrganisations.map(async organisation => ({
          id: organisation.id,
          name: organisation.name,
          acronym: organisation.acronym ?? '',
          organisationUnits: (await organisation.organisationUnits).map(organisationUnit => ({
            id: organisationUnit.id,
            name: organisationUnit.name,
            acronym: organisationUnit.acronym
          }))
        }))
      );

    } catch (error) {
      throw new InternalServerError(GenericErrorsEnum.UNKNOWN_ERROR);
    }

  }


  async getOrganisationUnitAccessors(organisationUnitId: string): Promise<{ id: string, organisationUnitUserId: string, name: string }[]> {

    const organisationUnitUsers = await this.sqlConnection.createQueryBuilder(OrganisationUnitUserEntity, 'organisationUnitUser')
      .innerJoinAndSelect('organisationUnitUser.organisationUser', 'organisationUser')
      .innerJoinAndSelect('organisationUser.user', 'user')
      // TODO: Does it make sense to inner join to validate if organisation and unit are active?
      .where('organisationUnitUser.organisation_unit_id = :organisationUnitId', { organisationUnitId })
      .getMany() || [];


    // If 0 users, no more work need to be done!
    if (organisationUnitUsers.length === 0) {
      return [];
    }

    const userIds = organisationUnitUsers.map(item => item.organisationUser.user.id);
    const authUsers = await this.domainService.users.getUsersList({ userIds });

    return organisationUnitUsers.reduce((acc: { id: string, organisationUnitUserId: string, name: string }[], organisationUnitUser) => {

      const dbUser = organisationUnitUser.organisationUser.user;
      const authUser = authUsers.find(item => ((item.id === dbUser.id) && item.isActive));

      if (authUser) { // Filters by existing AND active users on identity provider.
        return [
          ...acc,
          ...[{
            id: dbUser.id,
            organisationUnitUserId: organisationUnitUser.id,
            name: authUser.displayName
          }]
        ];
      } else {
        return acc;
      }

    }, []);

  }

}
