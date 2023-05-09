import { inject, injectable } from 'inversify';
import type { EntityManager } from 'typeorm';

import { OrganisationEntity, OrganisationUnitEntity, UserRoleEntity } from '@users/shared/entities';
import { OrganisationTypeEnum, ServiceRoleEnum } from '@users/shared/enums';
import { ConflictError, NotFoundError, OrganisationErrorsEnum } from '@users/shared/errors';

import { IdentityProviderServiceSymbol, IdentityProviderServiceType } from '@users/shared/services';
import { BaseService } from './base.service';

@injectable()
export class OrganisationsService extends BaseService {
  constructor(
    @inject(IdentityProviderServiceSymbol)
    private identityProviderService: IdentityProviderServiceType
  ) {
    super();
  }

  async getOrganisationsList(filters: { fields?: 'organisationUnits'[]; withInactive?: boolean }): Promise<
    {
      id: string;
      name: string;
      acronym: string;
      isActive: boolean;
      organisationUnits?: { id: string; name: string; acronym: string; isActive: boolean }[];
    }[]
  > {
    const query = this.sqlConnection
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
          ? (await unit.organisationUnitUsers).filter(unitUser => !unitUser.organisationUser.user.lockedAt).length
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

  // Change to email
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
      .getMany();

    if (!roles.length) {
      throw new NotFoundError(OrganisationErrorsEnum.ORGANISATION_USER_NOT_FOUND);
    }

    let role = roles[0]; // this default will make sure we have access to the user_id

    for (const userRole of roles) {
      if (userRole.role === ServiceRoleEnum.INNOVATOR) {
        throw new ConflictError(OrganisationErrorsEnum.ORGANISATION_UNIT_USER_CANT_BE_INNOVATOR);
      }

      if (userRole.organisation !== null && userRole.organisation.id !== organisation.id) {
        throw new ConflictError(OrganisationErrorsEnum.ORGANISATION_USER_FROM_OTHER_ORG);
      } else {
        role = userRole;
      }

      if (userRole.organisationUnit !== null && userRole.organisationUnit.id === organisationUnitId) {
        throw new ConflictError(OrganisationErrorsEnum.ORGANISATION_UNIT_USER_ALREADY_EXISTS);
      }
    }

    // If it reaches this point we are sure that role exists
    return {
      id: role!.user.id,
      name: b2cUser.displayName,
      email: b2cUser.email,
      role: role!.role !== ServiceRoleEnum.ASSESSMENT ? role!.role : null
    };
  }
}
