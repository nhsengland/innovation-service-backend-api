import { inject, injectable } from 'inversify';
import type { EntityManager } from 'typeorm';

import {
  InnovationSupportEntity,
  OrganisationEntity,
  OrganisationUnitEntity,
  UserRoleEntity,
  UserEntity
} from '@users/shared/entities';
import {
  InnovationSupportStatusEnum,
  OrganisationTypeEnum,
  ServiceRoleEnum,
  UserStatusEnum
} from '@users/shared/enums';
import {
  BadRequestError,
  NotFoundError,
  OrganisationErrorsEnum,
  UserErrorsEnum,
  ForbiddenError
} from '@users/shared/errors';

import { BaseService } from './base.service';
import { DomainContextType, isAccessorDomainContextType } from '@users/shared/types';
import { addToArrayValueInMap } from '@users/shared/helpers/misc.helper';
import SHARED_SYMBOLS from '@users/shared/services/symbols';
import type { IdentityProviderService } from '@users/shared/services';

@injectable()
export class OrganisationsService extends BaseService {
  constructor(
    @inject(SHARED_SYMBOLS.IdentityProviderService) private identityProviderService: IdentityProviderService
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

      res.organisationUnits = (await organisation.organisationUnits)
        .map(unit => ({
          id: unit.id,
          name: unit.name,
          acronym: unit.acronym,
          isActive: !unit.inactivatedAt,
          userCount: unitUserCounts.get(unit.id) ?? 0
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
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

  async getAccessorAndInnovations(
    domainContext: DomainContextType,
    unitId: string,
    entityManager?: EntityManager
  ): Promise<{
    count: number;
    data: {
      accessor: { name: string; role: ServiceRoleEnum };
      innovations: { id: string; name: string }[];
    }[];
  }> {
    if (!isAccessorDomainContextType(domainContext)) throw new BadRequestError(UserErrorsEnum.USER_TYPE_INVALID);
    if (domainContext.organisation.organisationUnit.id !== unitId)
      throw new ForbiddenError(OrganisationErrorsEnum.ORGANISATION_USER_FROM_OTHER_ORG);

    const em = entityManager ?? this.sqlConnection.manager;

    const allUnitUsers = await em
      .createQueryBuilder(UserEntity, 'user')
      .select(['user.id', 'user.identityId', 'role.id', 'role.role'])
      .innerJoin('user.serviceRoles', 'role', 'role.organisation_unit_id = :unitId', { unitId })
      .where('user.status != :deletedStatus', { deletedStatus: UserStatusEnum.DELETED })
      .getMany();
    const usersInfoMap = await this.identityProviderService.getUsersMap(
      Array.from(new Set(allUnitUsers.map(u => u.identityId)))
    );
    const identityInfoMap = new Map<string, { name: string; role: ServiceRoleEnum }>(
      allUnitUsers.map(u => [
        u.identityId,
        { name: usersInfoMap.get(u.identityId)?.displayName ?? '[deleted user]', role: u.serviceRoles[0]!.role }
      ])
    );

    const supports = await em
      .createQueryBuilder(InnovationSupportEntity, 'support')
      .select([
        'support.id',
        'innovation.id',
        'innovation.name',
        'assignedRole.id',
        'assignedRole.role',
        'assignedUser.id',
        'assignedUser.identityId'
      ])
      .innerJoin('support.innovation', 'innovation')
      .innerJoin('support.userRoles', 'assignedRole')
      .innerJoin('assignedRole.user', 'assignedUser')
      .where('support.organisation_unit_id = :unitId', { unitId })
      .andWhere('support.status IN (:...engagingStatus)', {
        engagingStatus: [InnovationSupportStatusEnum.ENGAGING, InnovationSupportStatusEnum.WAITING]
      })
      .getMany();

    const innovationInfo = new Map<string, { id: string; name: string }>();
    const assigned2InnovationsMap = new Map<string, string[]>();

    for (const support of supports) {
      innovationInfo.set(support.innovation.id, { id: support.innovation.id, name: support.innovation.name });
      for (const assigned of support.userRoles) {
        addToArrayValueInMap(assigned2InnovationsMap, assigned.user.identityId, support.innovation.id);
      }
    }

    const data: Awaited<ReturnType<OrganisationsService['getAccessorAndInnovations']>>['data'] = [];

    for (const [identityId, accessor] of identityInfoMap.entries()) {
      const innovations = assigned2InnovationsMap.get(identityId) ?? [];

      // Business rule: If a user is locked but as innovations assigned to him we return it.
      const isActive = usersInfoMap.get(identityId)?.isActive ?? false;
      if (isActive || (!isActive && innovations.length > 0)) {
        data.push({ accessor, innovations: innovations.map(i => innovationInfo.get(i)!) });
      }
    }

    return { count: data.length, data: data.sort((a, b) => a.accessor.name.localeCompare(b.accessor.name)) };
  }
}
