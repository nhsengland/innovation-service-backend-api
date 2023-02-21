import { injectable } from 'inversify';

import { UserEntity, UserRoleEntity } from '@admin/shared/entities';
import { ServiceRoleEnum } from '@admin/shared/enums';

import { ValidationResult, AdminOperationsRulesMapper, AdminOperationType } from '../_config/admin-operations.config';

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


    // const dbUser = await this.sqlConnection.createQueryBuilder(UserEntity, 'user')
    //   .leftJoin('user.serviceRoles', 'userRoles')
    //   .where('user.id = :userId', { userId })
    //   .getOne();


    // if (!dbUserRoles) {
    //   throw new InternalServerError(UserErrorsEnum.USER_SQL_NOT_FOUND);
    // }

    // const userOrganisations = await dbUser.userOrganisations;
    // const userInfo = {
    //   id: dbUser.id,
    //   identityId: dbUser.identityId,
    //   roles: dbUser.serviceRoles.map(item => item.role),
    //   isActive: !dbUser.lockedAt,
    //   organisations: userOrganisations.map(userOrganisation => ({
    //     id: userOrganisation.organisation.id,
    //     name: userOrganisation.organisation.name,
    //     acronym: userOrganisation.organisation.acronym,
    //     role: userOrganisation.role,
    //     organisationUnits: userOrganisation.userOrganisationUnits.map(item => ({ id: item.organisationUnit.id, name: item.organisationUnit.name, acronym: item.organisationUnit.acronym }))
    //   }))
    // };

    const result: ValidationResult[] = [];
    const roles = [...new Set(dbUserRoles.map(item => item.role))]; // Removes duplicated.

    for (const role of roles) {

      const rules = AdminOperationsRulesMapper[operation][role] || [];

      for (const rule of rules) {

        switch (rule) {
          case 'AssessmentUserIsNotTheOnlyOne':
            result.push(await this.checkIfAssessmentUserIsNotTheOnlyOne(userId));
            break;

          // case 'LastAccessorUserOnOrganisationUnit':
          //   const organisationUnit = userInfo.organisations[0]?.organisationUnits[0];
          //   if (!organisationUnit) {
          //     throw new NotFoundError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND)
          //   }
          //   result.push(await this.checkIfQualifyingAccessorIsNotTheLastOneOfUnit({ id: userInfo.id, organisationUnit: organisationUnit }));
          //   break;

          // case 'LastAccessorFromUnitProvidingSupport':
          //   result.push(await this.checkIfNoInnovationIsBeingSupportedByAUnitWithOnlyThisAccessor({ id: userInfo.id }));
          //   break;

          // default: // This will never happens in runtime, but will NOT compile when missing items exists.
          //   const unknownType: never = rule;
          //   throw new UnprocessableEntityError(GenericErrorsEnum.INTERNAL_TYPING_ERROR, { details: { type: unknownType } });
        }

      }

    }

    return result;

  }


  /**
   * Returns TRUE if there's any other active assessment type user on the platform, excluding the user being checked.
   */
  private async checkIfAssessmentUserIsNotTheOnlyOne(userId: string): Promise<ValidationResult> {

    const dbUsersCount = await this.sqlConnection.createQueryBuilder(UserEntity, 'user')
      .innerJoin('user.serviceRoles', 'userRoles')
      .where('userRoles.role = :userRole', { userRole: ServiceRoleEnum.ASSESSMENT })
      .andWhere('user.id != :userId', { userId })
      .andWhere('user.locked_at IS NULL')
      .getCount();

    return { rule: 'AssessmentUserIsNotTheOnlyOne', valid: dbUsersCount > 0 }

  }

  /**
   * Returns TRUE if there's any other active qualifying accessors on the supplied organisation unit,
   * excluding the user being checked.
   */
  // private async checkIfQualifyingAccessorIsNotTheLastOneOfUnit(user: { id: string, organisationUnit: { id: string, name: string, acronym: string } }): Promise<ValidationResult> {

  //   const otherQualifyingAccessorUsersCount = await this.sqlConnection.createQueryBuilder(OrganisationUserEntity, 'organisationUser')
  //     .innerJoinAndSelect('organisationUser.userOrganisationUnits', 'userOrganisationUnits')
  //     .where('organisationUser.user_id != :userId', { userId: user.id })
  //     .andWhere('organisationUser.role = :role', { role: AccessorOrganisationRoleEnum.QUALIFYING_ACCESSOR })
  //     .andWhere('userOrganisationUnits.organisation_unit_id = :organisationUnitId', { organisationUnitId: user.organisationUnit.id })
  //     .getCount();

  //   return {
  //     rule: 'LastAccessorUserOnOrganisationUnit',
  //     valid: otherQualifyingAccessorUsersCount > 0,
  //     data: { organisationUnit: user.organisationUnit }
  //   }

  // }

  /**
   * Returns TRUE if there's NO innovations being supported by an organisation unit WITH ONLY this (accessor) user (I believe that's the rule...),
   */
  // private async checkIfNoInnovationIsBeingSupportedByAUnitWithOnlyThisAccessor(user: { id: string }): Promise<ValidationResult> {

  //   const query = this.sqlConnection.createQueryBuilder(InnovationEntity, 'innovation')

  //     .select(['innovation.id', 'innovation.name'])
  //     // }'innovation.id', 'innovationId')
  //     // .select('innovation.id', 'innovationId')
  //     // .addSelect('innovation.name', 'innovationName')
  //     .innerJoin('innovation_support', 'supports', 'innovation.id = supports.innovation_id')
  //     .innerJoin('innovation_support_user', 'userSupport', 'supports.id = userSupport.innovation_support_id')
  //     .innerJoin('organisation_unit_user', 'unitUsers', 'userSupport.organisation_unit_user_id = unitUsers.id')
  //     .innerJoin('organisation_unit', 'unit', 'unit.id = unitUsers.organisation_unit_id')
  //     .innerJoin('organisation_user', 'organisationUser', 'organisationUser.id = unitUsers.organisation_user_id')
  //     .innerJoin('user', 'usr', 'organisationUser.user_id = usr.id and usr.locked_at IS NULL')
  //     .where('organisationUser.user_id = :userId', { userId: user.id })
  //     .andWhere('supports.status = :status', { status: InnovationSupportStatusEnum.ENGAGING })
  //     .andWhere(
  //       `NOT EXISTS(
  //           SELECT 1 FROM innovation_support s
  //           INNER JOIN innovation_support_user u on s.id = u.innovation_support_id
  //           INNER JOIN organisation_unit_user ous on ous.id = u.organisation_unit_user_id
  //           INNER JOIN organisation_user ou on ou.id = ous.organisation_user_id
  //           WHERE s.id = supports.id and ou.user_id != :userId and s.deleted_at IS NULL
  //         )`,
  //       { userId: user.id }
  //     );

  //   const innovations = await query.getMany();

  //   return {
  //     rule: 'LastAccessorFromUnitProvidingSupport',
  //     valid: innovations.length === 0,
  //     data: { supports: { count: innovations.length, innovations: innovations.map(item => ({ id: item.id, name: item.name })) } }
  //   }

  // }

}
