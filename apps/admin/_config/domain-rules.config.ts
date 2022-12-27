import { SQLDB_DATASOURCE } from '@admin/shared/config';
import { UserEntity, InnovationEntity, OrganisationUserEntity } from '@admin/shared/entities';
import { UserTypeEnum, AccessorOrganisationRoleEnum, InnovationSupportStatusEnum } from '@admin/shared/enums';
import { UserErrorsEnum, InternalServerError, NotFoundError, OrganisationErrorsEnum } from '@admin/shared/errors';

export enum DomainOperationEnum {
  LOCK_USER = 'LOCK_USER',
  UPDATE_USER_ROLE = 'UPDATE_USER_ROLE',
  CHANGE_UNIT = 'CHANGE_UNIT'
}

export enum DomainOperationRulesEnum {
  AssessmentUserIsNotTheOnlyOne = 'assessmentUserIsNotTheOnlyOne',
  LastAccessorUserOnOrganisationUnit = 'lastAccessorUserOnOrganisationUnit',
  LastAccessorFromUnitProvidingSupport = 'lastAccessorFromUnitProvidingSupport',
}


export type ValidationResult = {
  operation: DomainOperationRulesEnum;
  valid: boolean;
  meta?: {
    organisationUnit?: { id: string, name: string, acronym: string },
    supports?: { count: number, innovations: { id: string, name: string }[] }
  };
};


export const RuleMapper: { [operationKey in DomainOperationEnum]: { [userTypeKey in UserTypeEnum]?: DomainOperationRulesEnum[] } } = {

  'LOCK_USER': {
    [UserTypeEnum.ASSESSMENT]: [DomainOperationRulesEnum.AssessmentUserIsNotTheOnlyOne],
    [UserTypeEnum.ACCESSOR]: [
      DomainOperationRulesEnum.LastAccessorUserOnOrganisationUnit,
      DomainOperationRulesEnum.LastAccessorFromUnitProvidingSupport
    ]
  },


  'UPDATE_USER_ROLE': {
    [UserTypeEnum.ACCESSOR]: [DomainOperationRulesEnum.LastAccessorUserOnOrganisationUnit]
  },

  'CHANGE_UNIT': {
    [UserTypeEnum.ACCESSOR]: [
      DomainOperationRulesEnum.LastAccessorFromUnitProvidingSupport,
      DomainOperationRulesEnum.LastAccessorUserOnOrganisationUnit
    ]
  }

};


export class DomainRulesHelper {

  static async validate(operation: DomainOperationEnum, userId: string): Promise<ValidationResult[]> {

    const userRepository = SQLDB_DATASOURCE.getRepository(UserEntity);

    const dbUser = await userRepository.createQueryBuilder('user')
      .leftJoinAndSelect('user.userOrganisations', 'userOrganisations')
      .leftJoinAndSelect('userOrganisations.organisation', 'organisation')
      .leftJoinAndSelect('userOrganisations.userOrganisationUnits', 'userOrganisationUnits')
      .leftJoinAndSelect('userOrganisationUnits.organisationUnit', 'organisationUnit')
      .where('user.id = :userId', { userId })
      .getOne();

    if (!dbUser) {
      throw new InternalServerError(UserErrorsEnum.USER_SQL_NOT_FOUND);
    }

    const userOrganisations = await dbUser.userOrganisations;
    const userInfo = {
      id: dbUser.id,
      identityId: dbUser.identityId,
      type: dbUser.type,
      roles: dbUser.serviceRoles.map(item => item.role.name),
      isActive: !dbUser.lockedAt,
      organisations: userOrganisations.map(userOrganisation => ({
        id: userOrganisation.organisation.id,
        name: userOrganisation.organisation.name,
        acronym: userOrganisation.organisation.acronym,
        role: userOrganisation.role,
        organisationUnits: userOrganisation.userOrganisationUnits.map(item => ({ id: item.organisationUnit.id, name: item.organisationUnit.name, acronym: item.organisationUnit.acronym }))
      }))
    };

    const rules = RuleMapper[operation][userInfo.type] || [];
    const result: ValidationResult[] = [];

    for (const rule of rules) {

      switch (rule) {
        case DomainOperationRulesEnum.AssessmentUserIsNotTheOnlyOne:
          result.push(await this.checkIfAssessmentUserIsNotTheOnlyOne(userInfo.id));
          break;

        case DomainOperationRulesEnum.LastAccessorUserOnOrganisationUnit:
          const organisationUnit = userInfo.organisations[0]?.organisationUnits[0];
          if (!organisationUnit) {
            throw new NotFoundError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND)
          }
          result.push(await this.checkIfQualifyingAccessorIsNotTheLastOneOfUnit({ id: userInfo.id, organisationUnit: organisationUnit }));
          break;

        case DomainOperationRulesEnum.LastAccessorFromUnitProvidingSupport:
          result.push(await this.checkIfNoInnovationIsBeingSupportedByAUnitWithOnlyThisAccessor({ id: userInfo.id }));
          break;

      }
    }

    return result;

  }


  /**
   * Returns TRUE if there's any other active assessment type user on the platform,
   * excluding the user being checked.
   */
  private static async checkIfAssessmentUserIsNotTheOnlyOne(userId: string): Promise<ValidationResult> {

    const userRepository = SQLDB_DATASOURCE.getRepository(UserEntity);

    const otherAssessmentUsersCount = await userRepository.createQueryBuilder('user')
      .where('user.type = :userType', { userType: UserTypeEnum.ASSESSMENT })
      .andWhere('user.id != :userId', { userId })
      .andWhere('user.locked_at IS NULL')
      .getCount();

    return {
      operation: DomainOperationRulesEnum.LastAccessorUserOnOrganisationUnit,
      valid: otherAssessmentUsersCount > 0
    }

  }

  /**
   * Returns TRUE if there's any other active qualifying accessors on the supplied organisation unit,
   * excluding the user being checked.
   */
  private static async checkIfQualifyingAccessorIsNotTheLastOneOfUnit(user: { id: string, organisationUnit: { id: string, name: string, acronym: string } }): Promise<ValidationResult> {

    const organisationUserRepository = SQLDB_DATASOURCE.getRepository(OrganisationUserEntity);

    const otherQualifyingAccessorUsersCount = await organisationUserRepository.createQueryBuilder('organisationUser')
      .innerJoinAndSelect('organisationUser.userOrganisationUnits', 'userOrganisationUnits')
      .where('organisationUser.user_id != :userId', { userId: user.id })
      .andWhere('organisationUser.role = :role', { role: AccessorOrganisationRoleEnum.QUALIFYING_ACCESSOR })
      .andWhere('userOrganisationUnits.organisation_unit_id = :organisationUnitId)', { organisationUnitId: user.organisationUnit.id })
      .getCount();

    return {
      operation: DomainOperationRulesEnum.LastAccessorUserOnOrganisationUnit,
      valid: otherQualifyingAccessorUsersCount > 0,
      meta: { organisationUnit: user.organisationUnit }
    }

  }

  /**
   * Returns TRUE if there's NO innovations being supported by an organisation unit WITH ONLY this (accessor) user (I believe that's the rule...),
   */
  private static async checkIfNoInnovationIsBeingSupportedByAUnitWithOnlyThisAccessor(user: { id: string }): Promise<ValidationResult> {

    const innovationRepository = SQLDB_DATASOURCE.getRepository(InnovationEntity);

    const query = innovationRepository.createQueryBuilder('innovation')
      .select('innovation.id', 'innovationId')
      .addSelect('innovation.name', 'innovationName')
      .addSelect('unit.id', 'unitId')
      .addSelect('unit.name', 'unitName')
      .innerJoin('innovation_support', 'supports', 'innovation.id = supports.innovation_id')
      .innerJoin('innovation_support_user', 'userSupport', 'supports.id = userSupport.innovation_support_id')
      .innerJoin('organisation_unit_user', 'unitUsers', 'userSupport.organisation_unit_user_id = unitUsers.id')
      .innerJoin('organisation_unit', 'unit', 'unit.id = unitUsers.organisation_unit_id')
      .innerJoin('organisation_user', 'organisationUser', 'organisationUser.id = unitUsers.organisation_user_id')
      .innerJoin('user', 'usr', 'organisationUser.user_id = usr.id and usr.locked_at IS NULL')
      .where('organisationUser.user_id = :userId', { userId: user.id })
      .andWhere('supports.status = :status', { status: InnovationSupportStatusEnum.ENGAGING })
      .andWhere(
        `NOT EXISTS(
            SELECT 1 FROM innovation_support s
            INNER JOIN innovation_support_user u on s.id = u.innovation_support_id
            INNER JOIN organisation_unit_user ous on ous.id = u.organisation_unit_user_id
            INNER JOIN organisation_user ou on ou.id = ous.organisation_user_id
            WHERE s.id = supports.id and ou.user_id != :userId and s.deleted_at IS NULL
          )`,
        { userId: user.id }
      );

    const innovations = await query.getRawMany();

    return {
      operation: DomainOperationRulesEnum.LastAccessorFromUnitProvidingSupport,
      valid: innovations.length === 0,
      meta: { supports: { count: innovations.length, innovations: innovations.map(item => ({ id: item.id, name: item.name })) } }
    }

  }

}
