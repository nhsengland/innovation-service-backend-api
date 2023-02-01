
import type { DataSource, Repository } from 'typeorm';
import type { AccessorDomainContextType, InnovatorDomainContextType } from '../../types';

import { ActivityLogEntity, OrganisationUnitUserEntity, OrganisationUserEntity } from '../../entities';
import { AccessorOrganisationRoleEnum, InnovatorOrganisationRoleEnum, UserTypeEnum } from '../../enums';
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
  async getContextFromUnitInfo(organisationUnitId: string, identityId: string): Promise<AccessorDomainContextType> {
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

    // These sanity checks should never happen in the database
    if(organisationUnitUser.organisationUser.user.type !== UserTypeEnum.ACCESSOR) throw new UnprocessableEntityError(AuthErrorsEnum.AUTH_INCONSISTENT_DATABASE_STATE);
    if( organisationUnitUser.organisationUser.role !== AccessorOrganisationRoleEnum.ACCESSOR &&
      organisationUnitUser.organisationUser.role !== AccessorOrganisationRoleEnum.QUALIFYING_ACCESSOR
    ) {
      throw new UnprocessableEntityError(AuthErrorsEnum.AUTH_INCONSISTENT_DATABASE_STATE);
    }

    return {
      id: organisationUnitUser.organisationUser.user.id,
      identityId: organisationUnitUser.organisationUser.user.identityId,
      organisation: {
        id: organisationUnitUser.organisationUnit.organisation.id,
        name: organisationUnitUser.organisationUnit.organisation.name,
        acronym: organisationUnitUser.organisationUnit.organisation.acronym,
        isShadow: organisationUnitUser.organisationUnit.organisation.isShadow,
        role: organisationUnitUser.organisationUser.role,
        size: organisationUnitUser.organisationUnit.organisation.size,
        // organisationUser: { id: organisationUnitUser.organisationUser.id },
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


  /**
   * TODO This is called for the innovators should probably be renamed
   * @deprecated
   */
  async getContextFromOrganisationInfo(organisationId: string, identityId: string): Promise<InnovatorDomainContextType> {
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

    if(organisationUser.user.type !== UserTypeEnum.INNOVATOR) throw new UnprocessableEntityError(AuthErrorsEnum.AUTH_INCONSISTENT_DATABASE_STATE);
    if(organisationUser.role !== InnovatorOrganisationRoleEnum.INNOVATOR_OWNER) throw new UnprocessableEntityError(AuthErrorsEnum.AUTH_INCONSISTENT_DATABASE_STATE);

    return {
      id: organisationUser.user.id,
      identityId: organisationUser.user.identityId,
      organisation: {
        id: organisationUser.organisation.id,
        name: organisationUser.organisation.name,
        acronym: organisationUser.organisation.acronym,
        isShadow: organisationUser.organisation.isShadow,
        role: organisationUser.role,
        size: organisationUser.organisation.size,
        // organisationUser: { id: organisationUser.id },
      },
      userType: organisationUser.user.type
    };
  }
}
