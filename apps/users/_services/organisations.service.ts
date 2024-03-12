import { injectable } from 'inversify';
import type { EntityManager } from 'typeorm';

import { OrganisationEntity, OrganisationUnitEntity, UserRoleEntity } from '@users/shared/entities';
import { OrganisationTypeEnum } from '@users/shared/enums';
import { NotFoundError, OrganisationErrorsEnum } from '@users/shared/errors';

import { BaseService } from './base.service';

@injectable()
export class OrganisationsService extends BaseService {
  constructor() {
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
    type: 'simple' | 'full',
    onlyActiveUsers?: boolean,
    entityManager?: EntityManager
  ): Promise<{
    id: string;
    name: string;
    acronym: string | null;
    organisationUnits?: {
      id: string;
      name: string;
      acronym: string;
      isActive: boolean;
      userCount: number;
    }[];
    isActive: boolean;
  }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const query = connection
      .createQueryBuilder(OrganisationEntity, 'organisation')
      .where('organisation.id = :organisationId', { organisationId });

    if (type === 'full') {
      query.leftJoinAndSelect('organisation.organisationUnits', 'unit');
    }

    const organisation = await query.getOne();

    if (!organisation) {
      throw new NotFoundError(OrganisationErrorsEnum.ORGANISATION_NOT_FOUND);
    }

    const res: Awaited<ReturnType<OrganisationsService['getOrganisationInfo']>> = {
      id: organisation.id,
      name: organisation.name,
      acronym: organisation.acronym,
      isActive: !organisation.inactivatedAt
    };

    if (type === 'full') {
      const organisationUserRoles = await connection
        .createQueryBuilder(UserRoleEntity, 'userRole')
        .where('userRole.organisation_id = :organisationId', { organisationId: organisation.id })
        .getMany();

      const unitUserCounts = onlyActiveUsers
        ? new Map(
            (await organisation.organisationUnits).map(u => [
              u.id,
              organisationUserRoles.filter(ur => ur.organisationUnitId === u.id && ur.isActive).length
            ])
          )
        : new Map(
            (await organisation.organisationUnits).map(u => [
              u.id,
              organisationUserRoles.filter(ur => ur.organisationUnitId === u.id).length
            ])
          );

      res.organisationUnits = (await organisation.organisationUnits).map(unit => ({
        id: unit.id,
        name: unit.name,
        acronym: unit.acronym,
        isActive: !unit.inactivatedAt,
        userCount: unitUserCounts.get(unit.id) ?? 0
      }));
    }

    return res;
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
}
