
import type { DomainContextType } from '../../types';
import type { DataSource, Repository } from 'typeorm';

import { ActivityLogEntity, OrganisationUnitUserEntity, OrganisationUserEntity } from '../../entities';
import { OrganisationErrorsEnum, UnprocessableEntityError } from '../../errors';



export class DomainContextService {

  activityLogRepository: Repository<ActivityLogEntity>;
  

  constructor(
    private sqlConnection: DataSource,
  ) {
    this.activityLogRepository = this.sqlConnection.getRepository(ActivityLogEntity);
  }

  async getContextFromUnitInfo(organisationUnitId: string, identityId: string): Promise<DomainContextType> {
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
        organisationUser: { id: organisationUnitUser.organisationUser.id },
        organisationUnit: {
          id: organisationUnitUser.organisationUnit.id,
          name: organisationUnitUser.organisationUnit.name,
          acronym: organisationUnitUser.organisationUnit.acronym,
          organisationUnitUser:  { id: organisationUnitUser.id },
        },
      },
      userType: organisationUnitUser.organisationUser.user.type
    };
  }


  async getContextFromOrganisationInfo(organisationId: string, identityId: string): Promise<DomainContextType> {
    const entityManager = this.sqlConnection.manager;
    const organisationUser = await entityManager.createQueryBuilder(OrganisationUserEntity, 'organisationUser')
    .innerJoinAndSelect('organisationUser.organisation', 'organisation')
    .innerJoinAndSelect('organisationUser.user', 'user')
    .where('organisation.id = :organisationId', { organisationId })
    .andWhere('user.external_id = :identityId', { identityId })
    .getOne();

    if (!organisationUser?.organisation) {
      throw new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_NOT_FOUND);
    }

    return {
      organisation: {
        id: organisationUser.organisation.id,
        name: organisationUser.organisation.name,
        acronym: organisationUser.organisation.acronym,
        isShadow: organisationUser.organisation.isShadow,
        role: organisationUser.role,
        size: organisationUser.organisation.size,
        organisationUser: { id: organisationUser.id },
        organisationUnit: null,
      },
      userType: organisationUser.user.type
    };
  }
}
