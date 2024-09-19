import type { UserRoleEntity } from '../entities/user/user-role.entity';
import { ServiceRoleEnum } from '../enums';
import { ConflictError, OrganisationErrorsEnum } from '../errors';

export class ValidationsHelper {
  static canAddUserToUnit(
    roles: UserRoleEntity[],
    organisationId: string,
    organisationUnitId: string
  ): { userId: string | undefined; userRole: ServiceRoleEnum | undefined } {
    let userId: string | undefined;
    let userRole: ServiceRoleEnum | undefined;

    for (const role of roles) {
      if (role.role === ServiceRoleEnum.INNOVATOR || role.role === ServiceRoleEnum.ADMIN) {
        throw new ConflictError(OrganisationErrorsEnum.ORGANISATION_UNIT_USER_CANT_BE_INNOVATOR_OR_ADMIN);
      }
      if (role.organisation && role.organisation.id !== organisationId) {
        throw new ConflictError(OrganisationErrorsEnum.ORGANISATION_USER_FROM_OTHER_ORG);
      }
      if (role.organisationUnit && role.organisationUnit.id === organisationUnitId) {
        throw new ConflictError(OrganisationErrorsEnum.ORGANISATION_UNIT_USER_ALREADY_EXISTS);
      }

      if (!userId && role.user?.id) {
        userId = role.user.id;
      }
      if (!userRole && role.organisation?.id === organisationId) {
        userRole = role.role;
      }
    }

    return { userId, userRole };
  }
}
