import { injectable } from 'inversify';
import type { Repository } from 'typeorm';

import { OrganisationEntity } from '@users/shared/entities';
import { OrganisationTypeEnum } from '@users/shared/enums';
import { GenericErrorsEnum, InternalServerError } from '@users/shared/errors';

import { BaseService } from './base.service';


@injectable()
export class OrganisationsService extends BaseService {

  organisationRepository: Repository<OrganisationEntity>;

  constructor() {
    super();
    this.organisationRepository = this.sqlConnection.getRepository(OrganisationEntity);
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

}
