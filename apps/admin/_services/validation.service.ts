import { injectable } from 'inversify';

import { InnovationEntity, UserEntity, UserRoleEntity } from '@admin/shared/entities';
import { InnovationSupportStatusEnum, ServiceRoleEnum } from '@admin/shared/enums';
import { GenericErrorsEnum, UnprocessableEntityError } from '@admin/shared/errors';

import { ValidationResult, AdminOperationsRulesMapper, AdminOperationType, AdminRuleType } from '../_config/admin-operations.config';

import { BaseService } from './base.service';


@injectable()
export class ValidationService extends BaseService {

  constructor(
  ) { super(); }

  async validate(operation: AdminOperationType, userId: string): Promise<ValidationResult[]> {

    const dbUserRoles = await this.sqlConnection.createQueryBuilder(UserRoleEntity, 'userRole')
      .select(['user.id', 'userRole.role'])
      .innerJoin('userRole.user', 'user')
      .where('userRole.user_id = :userId', { userId })
      .getMany();

    const result: ValidationResult[] = [];
    const roles = [...new Set(dbUserRoles.map(item => item.role))]; // Removes duplicated.

    for (const role of roles) {

      const rules = AdminOperationsRulesMapper[operation][role] || [];

      for (const rule of rules) {

        switch (rule) {

          case AdminRuleType.AssessmentUserIsNotTheOnlyOne:
            result.push(await this.checkIfAssessmentUserIsNotTheOnlyOne(userId));
            break;

          case AdminRuleType.LastQualifyingAccessorUserOnOrganisationUnit:
            result.push(await this.checkIfLastQualifyingAccessorUserOnOrganisationUnit(userId));
            break;

          case AdminRuleType.LastUserOnOrganisationUnit:
            result.push(await this.checkIfLastUserOnOrganisationUnit(userId));
            break;

          case AdminRuleType.NoInnovationsSupportedOnlyByThisUser:
            result.push(await this.checkIfNoInnovationsSupportedOnlyByThisUser(userId));
            break;

          default: // This will never happens in runtime, but will NOT compile when missing items exists.
            const unknownType: never = rule;
            throw new UnprocessableEntityError(GenericErrorsEnum.INTERNAL_TYPING_ERROR, { details: { type: unknownType } });

        }

      }

    }

    return result;

  }


  /**
   * Is VALID if there's any other active assessment role user on the platform, excluding the user being checked.
   */
  private async checkIfAssessmentUserIsNotTheOnlyOne(userId: string): Promise<ValidationResult> {

    const dbUsersCount = await this.sqlConnection.createQueryBuilder(UserEntity, 'user')
      .innerJoin('user.serviceRoles', 'userRoles')
      .where('userRoles.role = :userRole', { userRole: ServiceRoleEnum.ASSESSMENT })
      .andWhere('user.id != :userId', { userId })
      .andWhere('user.locked_at IS NULL')
      .getCount();

    return { rule: 'AssessmentUserIsNotTheOnlyOne', valid: dbUsersCount > 0 };

  }

  /**
   * Is VALID if there's any other active qualifying accessors on the user organisation units, excluding the user being checked.
   */
  private async checkIfLastQualifyingAccessorUserOnOrganisationUnit(userId: string): Promise<ValidationResult> {


    let dbResult: { organisationUnitId: string, numberOfUsers: number }[] = [];

    dbResult = await this.sqlConnection.createQueryBuilder(UserRoleEntity, 'userRole')
      .select(['userRole.organisation_unit_id AS organisationUnitId', 'COUNT(userRole.id) AS numberOfUsers'])
      .innerJoin('userRole.user', 'user')
      .innerJoin(subQuery => subQuery
        .from(UserRoleEntity, 'subQ_UserRole')
        .where('subQ_UserRole.user_id = :userId AND subQ_UserRole.role IN (:...subQUserRoles)', { userId, subQUserRoles: [ServiceRoleEnum.QUALIFYING_ACCESSOR] })
        , 'userOrganisationUnits', 'userOrganisationUnits.organisation_unit_id = userRole.organisation_unit_id')
      .where('userRole.role IN (:...userRoles) ', { userRoles: [ServiceRoleEnum.QUALIFYING_ACCESSOR] })
      .andWhere('user.locked_at IS NULL')
      .groupBy('userRole.organisation_unit_id')
      .getRawMany();

    return { rule: 'LastQualifyingAccessorUserOnOrganisationUnit', valid: dbResult.every(item => item.numberOfUsers > 1) };

  }

  /**
 * Is VALID if there's any other active user on it's organisation units.
 */
  private async checkIfLastUserOnOrganisationUnit(userId: string): Promise<ValidationResult> {

    let dbResult: { organisationUnitId: string, numberOfUsers: number }[] = [];

    dbResult = await this.sqlConnection.createQueryBuilder(UserRoleEntity, 'userRole')
      .select(['userRole.organisation_unit_id AS organisationUnitId', 'COUNT(userRole.id) AS numberOfUsers'])
      .innerJoin('userRole.user', 'user')
      .innerJoin(subQuery => subQuery
        .from(UserRoleEntity, 'subQ_UserRole')
        .where('subQ_UserRole.user_id = :userId AND subQ_UserRole.role IN (:...userRoles)', { userId, userRoles: [ServiceRoleEnum.QUALIFYING_ACCESSOR, ServiceRoleEnum.ACCESSOR] })
        , 'userOrganisationUnits', 'userOrganisationUnits.organisation_unit_id = userRole.organisation_unit_id')
      .where('user.locked_at IS NULL')
      .groupBy('userRole.organisation_unit_id')
      .getRawMany();

    return { rule: 'LastUserOnOrganisationUnit', valid: dbResult.every(item => item.numberOfUsers > 1) };

  }

  /**
   * Returns VALID if there's NO innovations being supported only by this (accessor) user.
   */
  private async checkIfNoInnovationsSupportedOnlyByThisUser(userId: string): Promise<ValidationResult> {

    const innovationSupportedOnlyByUser = await this.sqlConnection.createQueryBuilder(InnovationEntity, 'innovation')
      .select(['innovation.id', 'innovation.name'])
      .innerJoin('innovation.innovationSupports', 'supports')
      .innerJoin('supports.organisationUnitUsers', 'organisationUnitUser')
      .innerJoin('organisationUnitUser.organisationUser', 'organisationUser')
      .innerJoin('organisationUser.user', 'user')
      .where('organisationUser.user_id = :userId', { userId })
      .andWhere('user.locked_at IS NULL')
      .andWhere('supports.status = :status', { status: InnovationSupportStatusEnum.ENGAGING })
      .andWhere(
        `NOT EXISTS(
            SELECT 1 FROM innovation_support s
            INNER JOIN innovation_support_user u on s.id = u.innovation_support_id
            INNER JOIN organisation_unit_user ous on ous.id = u.organisation_unit_user_id
            INNER JOIN organisation_user ou on ou.id = ous.organisation_user_id
            WHERE s.id = supports.id and ou.user_id != :innerUserId and s.deleted_at IS NULL
          )`,
        { innerUserId: userId }
      )
      .getMany();

    return {
      rule: 'NoInnovationsSupportedOnlyByThisUser',
      valid: innovationSupportedOnlyByUser.length === 0,
      data: { supports: { count: innovationSupportedOnlyByUser.length, innovations: innovationSupportedOnlyByUser.map(item => ({ id: item.id, name: item.name })) } }
    };

  }

}
