import { injectable } from 'inversify';

import { InnovationEntity, OrganisationEntity, UserEntity, UserRoleEntity } from '@admin/shared/entities';
import { InnovationSupportStatusEnum, ServiceRoleEnum, UserStatusEnum } from '@admin/shared/enums';

import { ValidationRuleEnum } from '../_config/admin-operations.config';

import { BaseService } from './base.service';
import { NotFoundError, OrganisationErrorsEnum } from '@admin/shared/errors';
import { UserErrorsEnum } from '@admin/shared/errors';
import type { EntityManager } from 'typeorm';
import type { ValidationResult } from '../types/validation.types';

@injectable()
export class ValidationService extends BaseService {
  constructor() {
    super();
  }

  /**
   * Is VALID if there's any other active assessment role user on the platform, excluding the user being checked.
   */
  async checkIfAssessmentUserIsNotTheOnlyOne(userId: string, entityManager?: EntityManager): Promise<ValidationResult> {
    const em = entityManager ?? this.sqlConnection.manager;
    const dbUsersCount = await em
      .createQueryBuilder(UserEntity, 'user')
      .innerJoin('user.serviceRoles', 'userRoles')
      .where('userRoles.role = :userRole', { userRole: ServiceRoleEnum.ASSESSMENT })
      .andWhere('user.id != :userId', { userId })
      .andWhere('user.status = :userActive', { userActive: UserStatusEnum.ACTIVE })
      .getCount();

    return { rule: ValidationRuleEnum.AssessmentUserIsNotTheOnlyOne, valid: dbUsersCount > 0 };
  }

  /**
   * Is VALID if there's any other active qualifying accessors on the user organisation unit of the role, excluding the user being checked.
   */
  async checkIfLastQualifyingAccessorUserOnOrganisationUnit(
    userRoleId: string,
    entityManager?: EntityManager
  ): Promise<ValidationResult> {
    const em = entityManager ?? this.sqlConnection.manager;

    const role = await em
      .createQueryBuilder(UserRoleEntity, 'userRole')
      .select(['userRole.id', 'organisationUnit.id'])
      .innerJoin('userRole.organisationUnit', 'organisationUnit')
      .where('userRole.id = :userRoleId', { userRoleId: userRoleId })
      .getOne();

    if (!role) {
      throw new NotFoundError(UserErrorsEnum.USER_ROLE_NOT_FOUND);
    }

    const numberOfUsers = await em
      .createQueryBuilder(UserRoleEntity, 'userRole')
      .innerJoin('userRole.organisationUnit', 'organisationUnit')
      .where('organisationUnit.id = :organisationUnitId', { organisationUnitId: role.organisationUnit?.id })
      .andWhere('userRole.role = :roleType', { roleType: ServiceRoleEnum.QUALIFYING_ACCESSOR })
      .getCount();

    return {
      rule: ValidationRuleEnum.LastQualifyingAccessorUserOnOrganisationUnit,
      valid: numberOfUsers > 1
    };
  }

  /**
   * Returns VALID if there's NO innovations being supported only by this (accessor) user.
   */
  async checkIfNoInnovationsSupportedOnlyByThisUser(
    userRoleId: string,
    entityManager?: EntityManager
  ): Promise<ValidationResult> {
    const em = entityManager ?? this.sqlConnection.manager;

    const role = await em
      .createQueryBuilder(UserRoleEntity, 'userRole')
      .innerJoinAndSelect('userRole.organisationUnit', 'organisationUnit')
      .innerJoinAndSelect('userRole.user', 'user')
      .where('userRole.id = :userRoleId', { userRoleId: userRoleId })
      .getOne();

    if (!role) {
      throw new NotFoundError(UserErrorsEnum.USER_ROLE_NOT_FOUND);
    }

    const innovationSupportedOnlyByUser = await em
      .createQueryBuilder(InnovationEntity, 'innovation')
      .select(['innovation.id', 'innovation.name'])
      .innerJoin('innovation.innovationSupports', 'supports')
      .innerJoin('supports.organisationUnitUsers', 'organisationUnitUser')
      .innerJoin('supports.organisationUnit', 'organisationUnit')
      .innerJoin('organisationUnitUser.organisationUser', 'organisationUser')
      .innerJoin('organisationUser.user', 'user')
      .where('organisationUnit.id = :organisationUnitId', { organisationUnitId: role.organisationUnit?.id })
      .andWhere('user.status = :userActive', { userActive: UserStatusEnum.ACTIVE })
      .andWhere('supports.status = :status', { status: InnovationSupportStatusEnum.ENGAGING })
      .andWhere(
        `NOT EXISTS(
            SELECT 1 FROM innovation_support s
            INNER JOIN innovation_support_user u on s.id = u.innovation_support_id
            INNER JOIN organisation_unit_user ous on ous.id = u.organisation_unit_user_id
            INNER JOIN organisation_user ou on ou.id = ous.organisation_user_id
            WHERE s.id = supports.id and ou.user_id != :innerUserId and s.deleted_at IS NULL
          )`,
        { innerUserId: role.user.id }
      )
      .getMany();

    return {
      rule: ValidationRuleEnum.NoInnovationsSupportedOnlyByThisUser,
      valid: innovationSupportedOnlyByUser.length === 0
    };
  }

  private roleTypeToValidationRule(role: ServiceRoleEnum): ValidationRuleEnum {
    switch (role) {
      case ServiceRoleEnum.ADMIN:
        return ValidationRuleEnum.UserHasAnyAdminRole;
      case ServiceRoleEnum.INNOVATOR:
        return ValidationRuleEnum.UserHasAnyInnovatorRole;
      case ServiceRoleEnum.ASSESSMENT:
        return ValidationRuleEnum.UserHasAnyAssessmentRole;
      case ServiceRoleEnum.ACCESSOR:
        return ValidationRuleEnum.UserHasAnyAccessorRole;
      case ServiceRoleEnum.QUALIFYING_ACCESSOR:
        return ValidationRuleEnum.UserHasAnyQualifyingAccessorRole;
    }
  }

  async checkIfUserHasAnyRole(
    userId: string,
    roles: ServiceRoleEnum[],
    ignoreRoleId?: string,
    entityManager?: EntityManager
  ): Promise<ValidationResult[]> {
    const em = entityManager ?? this.sqlConnection.manager;

    // inactive roles are also taken into account
    const query = em
      .createQueryBuilder(UserRoleEntity, 'userRole')
      .where('userRole.user_id = :userId', { userId })
      .andWhere('userRole.role IN (:...roles)', { roles })

    if (ignoreRoleId) {
      query.andWhere('userRole.id != :userRoleId', { userRoleId: ignoreRoleId })
    }

    const userRoles = await query.getMany();

    const validations: ValidationResult[] = [];

    for (const role of roles) {
      validations.push({
        rule: this.roleTypeToValidationRule(role),
        valid: !userRoles.some(r => r.role === role)
      });
    }

    return validations;
  }

  async checkIfUserHasAnyAccessorRoleInOtherOrganisation(
    userId: string,
    organisationUnitId: string,
    entityManager?: EntityManager
  ): Promise<ValidationResult> {
    const em = entityManager ?? this.sqlConnection.manager;

    const organisation = await em.createQueryBuilder(OrganisationEntity, 'organisation')
      .innerJoin('organisation.organisationUnits', 'unit')
      .where('unit.id = :organisationUnitId', { organisationUnitId })
      .getOne();

    if (!organisation) {
      throw new NotFoundError(OrganisationErrorsEnum.ORGANISATION_NOT_FOUND);
    }

    const otherOrganisationRoles = await em.createQueryBuilder(UserRoleEntity, 'userRole')
      .where('userRole.organisation_id != :organisationId', { organisationId: organisation.id })
      .andWhere('userRole.user_id = :userId', { userId })
      .getCount();
    
    return {
      rule: ValidationRuleEnum.UserHasAnyAccessorRoleInOtherOrganisation,
      valid: otherOrganisationRoles === 0
    }
  }

  async checkIfUnitIsActive(
    userRoleId: string,
    entityManager?: EntityManager
  ): Promise<ValidationResult> {
    const em = entityManager ?? this.sqlConnection.manager;

    const role = await em.createQueryBuilder(UserRoleEntity, 'userRole')
      .innerJoinAndSelect('userRole.organisationUnit', 'unit')
      .where('userRole.id = :userRoleId', { userRoleId })
      .getOne();

    if (!role) {
      throw new NotFoundError(UserErrorsEnum.USER_ROLE_NOT_FOUND);
    }

    return {
      rule: ValidationRuleEnum.OrganisationUnitIsActive,
      valid: !role.organisationUnit?.inactivatedAt 
    }
  }

  async checkIfUserAlreadyHasRoleInUnit(userId: string, organisationUnitId: string, entityManager?: EntityManager): Promise<ValidationResult> {
    const em = entityManager ?? this.sqlConnection.manager;

    const role = await em.createQueryBuilder(UserRoleEntity, 'userRole')
      .where('userRole.user_id = :userId', { userId })
      .andWhere('userRole.organisation_unit_id = :organisationUnitId', { organisationUnitId })
      .getOne();

    return {
      rule: ValidationRuleEnum.UserAlreadyHasRoleInUnit,
      valid: !role
    }
  }
}
