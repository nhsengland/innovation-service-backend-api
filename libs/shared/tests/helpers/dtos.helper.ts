/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { RecipientType } from 'apps/notifications/_services/recipients.service';
import { ServiceRoleEnum } from '../../enums/user.enums';
import type { DomainContextType } from '../../types/domain.types';

import type { TestUserType } from '../builders/user.builder';

export class DTOsHelper {
  static getUserRequestContext<T extends TestUserType>(user: T, userRoleKey?: keyof T['roles']): DomainContextType {

    if (!userRoleKey) {
      if (Object.keys(user.roles).length === 1) {
        userRoleKey = Object.keys(user.roles)[0]!;
      } else {
        throw new Error('DTOsHelper::getUserRequestContext: More than 1 role, needs userRoleKey parameter defined.');
      }
    }

    const role = user.roles[userRoleKey as string];
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
        }
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

  static getRecipientUser<T extends TestUserType>(user: T, userRoleKey?: keyof T['roles']): RecipientType {

    if (!userRoleKey) {
      if (Object.keys(user.roles).length === 1) {
        userRoleKey = Object.keys(user.roles)[0]!;
      } else {
        throw new Error('DTOsHelper::getRecipientUser: User with more than 1 role, needs userRole parameter defined.');
      }
    }

    const role = user.roles[userRoleKey as string];

    if (!role) {
      throw new Error('DTOsHelper::getRecipientUser: User role not found.');
    }

    if (role.role === ServiceRoleEnum.INNOVATOR && !role.organisation) {
      throw new Error('DTOsHelper::getRecipientUser: Invalid role found.');
    }

    if (
      (role.role === ServiceRoleEnum.ACCESSOR || role.role === ServiceRoleEnum.QUALIFYING_ACCESSOR) &&
      (!role.organisation || !role.organisationUnit)
    ) {
      throw new Error('DTOsHelper::getRecipientUser: Invalide role found.');
    }

    if (
      [ServiceRoleEnum.ASSESSMENT, ServiceRoleEnum.ADMIN].includes(role.role) &&
      (role.organisation || role.organisationUnit)
    ) {
      throw new Error('DTOsHelper::getRecipientUser: Invalid role found .');
    }

    return {
      roleId: role.id,
      role: role.role,
      userId: user.id,
      identityId: user.identityId,
      isActive: user.isActive
    };
  }
}
