import { ServiceRoleEnum } from '../../enums/user.enums';
import type { DomainContextType } from '../../types/domain.types';

import type { TestUserType } from '../builders/user.builder';

export class DTOsHelper {

  static getUserRequestContext(user: TestUserType, userRole?: ServiceRoleEnum): DomainContextType {

    if (!userRole) {
      if (user.roles.length === 1) {
        userRole = user.roles[0]?.role;
      } else {
        throw new Error('DTOsHelper::getUserContext: User with more than 1 role, needs userRole parameter defined.');
      }
    }

    const role = user.roles.find(r => r.role === userRole);
    if (!role) {
      throw new Error('DTOsHelper::getUserContext: User role not found.');
    }

    if (role.role === ServiceRoleEnum.INNOVATOR) {
      if (!role.organisation) {
        throw new Error('Invalid role found.');
      }
      return {
        id: user.id,
        identityId: user.identityId,
        currentRole: { id: role.id, role: role.role },
        organisation: { id: role.organisation.id, name: role.organisation.name, acronym: null }
      };
    }

    if (role.role === ServiceRoleEnum.ACCESSOR || role.role === ServiceRoleEnum.QUALIFYING_ACCESSOR) {
      if (!role.organisation || !role.organisationUnit) {
        throw new Error('Invalid role found.');
      }
      return {
        id: user.id,
        identityId: user.identityId,
        currentRole: { id: role.id, role: role.role },
        organisation: {
          id: role.organisation.id,
          name: role.organisation.name,
          acronym: null,
          organisationUnit: { id: role.organisationUnit.id, name: role.organisationUnit.name, acronym: '' }
        },
      };
    }

    if (role.role === ServiceRoleEnum.ADMIN) {
      return {
        id: user.id,
        identityId: user.identityId,
        currentRole: { id: role.id, role: role.role }
      };
    }

    if (role.role === ServiceRoleEnum.ASSESSMENT) {
      return {
        id: user.id,
        identityId: user.identityId,
        currentRole: { id: role.id, role: role.role }
      };
    }

    throw new Error('DTOsHelper::getUserContext: Unexpected error, no role found.');
  }

}
