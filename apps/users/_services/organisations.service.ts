import { inject, injectable } from 'inversify';
import type { EntityManager } from 'typeorm';

import { OrganisationEntity, OrganisationUnitEntity, UserRoleEntity } from '@users/shared/entities';
import { OrganisationTypeEnum, ServiceRoleEnum, UserStatusEnum } from '@users/shared/enums';
import { NotFoundError, OrganisationErrorsEnum } from '@users/shared/errors';
import { ValidationsHelper } from '@users/shared/helpers';
import type { IdentityProviderService } from '@users/shared/services';
import SHARED_SYMBOLS from '@users/shared/services/symbols';

import { BaseService } from './base.service';

@injectable()
export class OrganisationsService extends BaseService {
  constructor(
    @inject(SHARED_SYMBOLS.IdentityProviderService)
    private identityProviderService: IdentityProviderService
  ) {
    super();
  }

  async getOrganisationsList(
    filters: { fields?: 'organisationUnits'[]; withInactive?: boolean },
    entityManager?: EntityManager
  ): Promise<
    {
      id: string;
      name: string;
      acronym: string;
      isActive: boolean;
      organisationUnits?: { id: string; name: string; acronym: string; isActive: boolean }[];
    }[]
  > {
    const em = entityManager ?? this.sqlConnection.manager;

    const query = em
      .createQueryBuilder(OrganisationEntity, 'organisation')
      .where('organisation.type = :type', { type: OrganisationTypeEnum.ACCESSOR });

    if (!filters.withInactive) {
      query.andWhere('organisation.inactivated_at IS NULL');
    }

    if (filters.fields?.includes('organisationUnits')) {
      query.innerJoinAndSelect('organisation.organisationUnits', 'organisationUnits');

      if (!filters.withInactive) {
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
        isActive: !organisation.inactivatedAt,

        ...(!filters.fields?.includes('organisationUnits')
          ? {}
          : {
              organisationUnits: (await organisation.organisationUnits).map(organisationUnit => ({
                id: organisationUnit.id,
                name: organisationUnit.name,
                acronym: organisationUnit.acronym,
                isActive: !organisationUnit.inactivatedAt
              }))
            })
      }))
    );
  }

  async getOrganisationInfo(
    organisationId: string,
    onlyActiveUsers?: boolean,
    entityManager?: EntityManager
  ): Promise<{
    id: string;
    name: string;
    acronym: string | null;
    organisationUnits: {
      id: string;
      name: string;
      acronym: string;
      isActive: boolean;
      userCount: number;
    }[];
    isActive: boolean;
  }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const organisationQuery = connection
      .createQueryBuilder(OrganisationEntity, 'organisation')
      .leftJoinAndSelect('organisation.organisationUnits', 'unit')
      .leftJoinAndSelect('unit.organisationUnitUsers', 'unitUsers')
      .where('organisation.id = :organisationId', { organisationId });

    if (onlyActiveUsers) {
      organisationQuery
        .leftJoinAndSelect('unitUsers.organisationUser', 'orgUser')
        .leftJoinAndSelect('orgUser.user', 'user');
    }

    const organisation = await organisationQuery.getOne();

    if (!organisation) {
      throw new NotFoundError(OrganisationErrorsEnum.ORGANISATION_NOT_FOUND);
    }

    const organisationUnits = await Promise.all(
      (
        await organisation.organisationUnits
      ).map(async unit => ({
        id: unit.id,
        name: unit.name,
        acronym: unit.acronym,
        isActive: !unit.inactivatedAt,
        userCount: onlyActiveUsers
          ? (
              await unit.organisationUnitUsers
            ).filter(unitUser => unitUser.organisationUser.user.status === UserStatusEnum.ACTIVE).length
          : (
              await unit.organisationUnitUsers
            ).length
      }))
    );

    return {
      id: organisation.id,
      name: organisation.name,
      acronym: organisation.acronym,
      organisationUnits,
      isActive: !organisation.inactivatedAt
    };
  }

  async getOrganisationUnitInfo(
    organisationUnitId: string,
    entityManager?: EntityManager
  ): Promise<{
    id: string;
    name: string;
    acronym: string;
    isActive: boolean;
    canActivate: boolean;
  }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const unit = await connection
      .createQueryBuilder(OrganisationUnitEntity, 'unit')
      .select(['unit.id', 'unit.name', 'unit.acronym', 'unit.inactivatedAt'])
      .where('unit.id = :organisationUnitId', { organisationUnitId })
      .getOne();

    if (!unit) {
      throw new NotFoundError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND);
    }

    const hasQualifyingAccessor = !!(await connection
      .createQueryBuilder(UserRoleEntity, 'user')
      .where('user.organisation_unit_id = :organisationUnitId', { organisationUnitId })
      .andWhere("role = 'QUALIFYING_ACCESSOR'")
      .getOne());

    return {
      id: unit.id,
      name: unit.name,
      acronym: unit.acronym,
      isActive: !unit.inactivatedAt,
      canActivate: hasQualifyingAccessor
    };
  }

  async getOrganisationUnitUserByEmail(
    organisationUnitId: string,
    email: string,
    entityManager?: EntityManager
  ): Promise<{ id: string; name: string; email: string; role: null | ServiceRoleEnum }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const b2cUser = await this.identityProviderService.getUserInfoByEmail(email);
    if (!b2cUser) {
      throw new NotFoundError(OrganisationErrorsEnum.ORGANISATION_USER_NOT_FOUND);
    }

    const organisation = await connection
      .createQueryBuilder(OrganisationEntity, 'organisation')
      .select(['organisation.id'])
      .innerJoin('organisation.organisationUnits', 'organisationUnits')
      .where('organisationUnits.id = :organisationUnitId', { organisationUnitId })
      .getOne();
    if (!organisation) {
      throw new NotFoundError(OrganisationErrorsEnum.ORGANISATION_NOT_FOUND);
    }

    // Get user and roles
    const roles = await connection
      .createQueryBuilder(UserRoleEntity, 'userRole')
      .select(['user.id', 'userRole.id', 'userRole.role', 'organisation.id', 'unit.id'])
      .innerJoin('userRole.user', 'user')
      .leftJoin('userRole.organisation', 'organisation')
      .leftJoin('userRole.organisationUnit', 'unit')
      .where('user.identityId = :identityId', { identityId: b2cUser.identityId })
      .andWhere('user.status <> :userDeleted', { userDeleted: UserStatusEnum.DELETED })
      .getMany();
    if (!roles.length) {
      throw new NotFoundError(OrganisationErrorsEnum.ORGANISATION_USER_NOT_FOUND);
    }

    const { userId, userRole } = ValidationsHelper.canAddUserToUnit(roles, organisation.id, organisationUnitId);

    // Not required
    if (!userId) {
      throw new NotFoundError(OrganisationErrorsEnum.ORGANISATION_USER_NOT_FOUND);
    }

    return {
      id: userId,
      name: b2cUser.displayName,
      email: b2cUser.email,
      role: userRole === ServiceRoleEnum.ACCESSOR || userRole === ServiceRoleEnum.QUALIFYING_ACCESSOR ? userRole : null
    };
  }
}
