
import type { DomainContextType } from '../../types';
import type { DataSource, Repository } from 'typeorm';

import { ActivityLogEntity, OrganisationUnitUserEntity } from '../../entities';
import { OrganisationErrorsEnum, UnprocessableEntityError } from '../../errors';



export class DomainContextService {

  activityLogRepository: Repository<ActivityLogEntity>;
  

  constructor(
    private sqlConnection: DataSource,
  ) {
    this.activityLogRepository = this.sqlConnection.getRepository(ActivityLogEntity);
  }

  async getContextInfo(organisationUnitId: string, identityId: string): Promise<DomainContextType> {
    const entityManager = this.sqlConnection.manager;
    const organisationUnitUser = await entityManager.createQueryBuilder(OrganisationUnitUserEntity, 'organisationUnitUser')
    .innerJoinAndSelect('organisationUnitUser.organisationUnit', 'organisationUnit')
    .innerJoinAndSelect('organisationUnit.organisation', 'organisation')
    .innerJoinAndSelect('organisationUnitUser.organisationUser', 'organisationUser')
    .innerJoinAndSelect('organisationUser.user', 'user')
    .where('organisationUnit.id = :organisationUnitId', { organisationUnitId })
    .andWhere('user.external_id = :identityId', { identityId })
    .getOne();

    if (!organisationUnitUser?.organisationUnit) {
      throw new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND);
    }

    return {
      organisation: {
        id: organisationUnitUser.organisationUnit.organisation.id,
        name: organisationUnitUser.organisationUnit.organisation.name,
        acronym: organisationUnitUser.organisationUnit.organisation.acronym,
        isShadow: organisationUnitUser.organisationUnit.organisation.isShadow,
        role: organisationUnitUser.organisationUser.role,
        size: organisationUnitUser.organisationUnit.organisation.size,
        organisationUnit: {
          id: organisationUnitUser.organisationUnit.id,
          name: organisationUnitUser.organisationUnit.name,
          acronym: organisationUnitUser.organisationUnit.acronym,
        },
      }
    };
  }

}
