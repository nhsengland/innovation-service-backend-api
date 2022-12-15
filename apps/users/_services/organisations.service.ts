import { injectable } from 'inversify';

import { OrganisationEntity } from '@users/shared/entities';
import { OrganisationTypeEnum, UserTypeEnum } from '@users/shared/enums';
import { GenericErrorsEnum, InternalServerError } from '@users/shared/errors';

import { BaseService } from './base.service';


@injectable()
export class OrganisationsService extends BaseService {

  constructor() { super(); }


  async getOrganisationsList(user: { type: UserTypeEnum },  filters: { fields?: ('organisationUnits')[] }): Promise<{ id: string, name: string, acronym: string, organisationUnits?: { id: string; name: string; acronym: string; }[] }[]> {

    try {

      const query = this.sqlConnection.createQueryBuilder(OrganisationEntity, 'organisation')
        .where('organisation.type = :type', { type: OrganisationTypeEnum.ACCESSOR });

      if(user.type !== UserTypeEnum.ADMIN) {
        query.andWhere('organisation.inactivated_at IS NULL');
      }

      if (filters.fields?.includes('organisationUnits')) {
        query.innerJoinAndSelect('organisation.organisationUnits', 'organisationUnits');

        if(user.type !== UserTypeEnum.ADMIN) {
          query.andWhere('organisationUnits.inactivated_at IS NULL');
        }
      }

      query.orderBy('organisation.name', 'ASC');

      const dbOrganisations = await query.getMany();


      return Promise.all(
        dbOrganisations.map(async organisation => ({
          id: organisation.id,
          name: organisation.name,
          acronym: organisation.acronym ?? '',

          ...(!filters.fields?.includes('organisationUnits') ? {} : {
            organisationUnits: (await organisation.organisationUnits).map(organisationUnit => ({
              id: organisationUnit.id,
              name: organisationUnit.name,
              acronym: organisationUnit.acronym
            }))
          })

        }))
      );

    } catch (error) {
      throw new InternalServerError(GenericErrorsEnum.UNKNOWN_ERROR);
    }

  }

}
