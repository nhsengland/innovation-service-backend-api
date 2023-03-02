
import type { DataSource, Repository } from 'typeorm';
import type { AccessorDomainContextType, InnovatorDomainContextType } from '../../types';

import { ActivityLogEntity, OrganisationUnitUserEntity, OrganisationUserEntity } from '../../entities';
import { InnovatorOrganisationRoleEnum, ServiceRoleEnum } from '../../enums';
import { OrganisationErrorsEnum, UnprocessableEntityError } from '../../errors';
import { AuthErrorsEnum } from '../auth/authorization-validation.model';

/**
 * TODO validate if this is still needed
 * @deprecated
 */
export class DomainContextService {

  activityLogRepository: Repository<ActivityLogEntity>;
  

  constructor(
    private sqlConnection: DataSource,
  ) {
    this.activityLogRepository = this.sqlConnection.getRepository(ActivityLogEntity);
  }

    /**
   * TODO this is called for the accessors and should probably be renamed
   * @deprecated
   */
  async getContextFromUnitInfo(organisationUnitId: string, identityId: string, role: {id: string, role: ServiceRoleEnum}): Promise<AccessorDomainContextType> {
    
    if (role.role !== ServiceRoleEnum.ACCESSOR && role.role !== ServiceRoleEnum.QUALIFYING_ACCESSOR) {
      throw new UnprocessableEntityError(AuthErrorsEnum.AUTH_INCONSISTENT_DATABASE_STATE);
    }

    const entityManager = this.sqlConnection.manager;
    const organisationUnitUser = await entityManager.createQueryBuilder(OrganisationUnitUserEntity, 'organisationUnitUser')
    .innerJoinAndSelect('organisationUnitUser.organisationUnit', 'organisationUnit')
    .innerJoinAndSelect('organisationUnit.organisation', 'organisation')
    .innerJoinAndSelect('organisationUnitUser.organisationUser', 'organisationUser')
    .innerJoinAndSelect('organisationUser.user', 'user')
    .innerJoinAndSelect('user.serviceRoles', 'serviceRoles')
    .where('organisationUnit.id = :organisationUnitId', { organisationUnitId })
    .andWhere('user.external_id = :identityId', { identityId })
    .andWhere('serviceRoles.role = :role', { role: role.role })
    .getOne();

    if (!organisationUnitUser) {
      throw new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND);
    }



    return {
      id: organisationUnitUser.organisationUser.user.id,
      identityId: organisationUnitUser.organisationUser.user.identityId,
      organisation: {
        id: organisationUnitUser.organisationUnit.organisation.id,
        name: organisationUnitUser.organisationUnit.organisation.name,
        acronym: organisationUnitUser.organisationUnit.organisation.acronym,
        organisationUnit: {
          id: organisationUnitUser.organisationUnit.id,
          name: organisationUnitUser.organisationUnit.name,
          acronym: organisationUnitUser.organisationUnit.acronym
        },
      },
      currentRole: {id: role.id, role: role.role},
    };
  }


  /**
   * TODO This is called for the innovators should probably be renamed
   * @deprecated
   */
  async getContextFromOrganisationInfo(organisationId: string, identityId: string, role: {id: string, role: ServiceRoleEnum}): Promise<InnovatorDomainContextType> {
    const entityManager = this.sqlConnection.manager;
    const organisationUser = await entityManager.createQueryBuilder(OrganisationUserEntity, 'organisationUser')
    .innerJoinAndSelect('organisationUser.organisation', 'organisation')
    .innerJoinAndSelect('organisationUser.user', 'user')
    .innerJoinAndSelect('user.serviceRoles', 'serviceRoles')
    .where('organisation.id = :organisationId', { organisationId })
    .andWhere('user.external_id = :identityId', { identityId })
    .andWhere('serviceRoles.role = :role', { role: role.role })
    .getOne();

    if (!organisationUser?.organisation) {
      throw new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_NOT_FOUND);
    }

    if(!organisationUser.user.serviceRoles.map(r => r.role).includes(ServiceRoleEnum.INNOVATOR)) throw new UnprocessableEntityError(AuthErrorsEnum.AUTH_INCONSISTENT_DATABASE_STATE);
    if(organisationUser.role !== InnovatorOrganisationRoleEnum.INNOVATOR_OWNER) throw new UnprocessableEntityError(AuthErrorsEnum.AUTH_INCONSISTENT_DATABASE_STATE);

    if (role.role !== ServiceRoleEnum.INNOVATOR) {
      throw new UnprocessableEntityError(AuthErrorsEnum.AUTH_INCONSISTENT_DATABASE_STATE);
    }

    return {
      id: organisationUser.user.id,
      identityId: organisationUser.user.identityId,
      organisation: {
        id: organisationUser.organisation.id,
        name: organisationUser.organisation.name,
        acronym: organisationUser.organisation.acronym,
      },
      currentRole: {id: role.id, role: role.role },
    };
  }
}
