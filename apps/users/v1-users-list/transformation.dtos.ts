import type { AccessorOrganisationRoleEnum, InnovatorOrganisationRoleEnum } from '@users/shared/enums';
import type { DateISOType, RoleType } from '@users/shared/types';

type AdminPortalResponseDTO = {
  id: string;
  email: string;
  name: string;
  roles: Pick<RoleType, 'role'>[];  // this might change in the future keeping this way for compatibility
  isActive: boolean;
  lockedAt?: DateISOType;
  organisations?: {
    id: string;
    name: string;
    acronym: string;
    role: InnovatorOrganisationRoleEnum | AccessorOrganisationRoleEnum;
    units?: {
      id: string; 
      name: string;
      acronym: string;
    }[]
  }[]
}

type UserListResponseDTO = {
  id: string;
  name: string;
  email?: string;
  roles: Pick<RoleType, 'role'>[];  // this might change in the future keeping this way for compatibility
  isActive: boolean;
  organisations?: {
    id: string;
    name: string;
    role: InnovatorOrganisationRoleEnum | AccessorOrganisationRoleEnum;
    units?: {
      id: string;
      name: string;
      organisationUnitUserId: string // It's strange that we require this and use this id instead of the user id (or now the role id) to identify the user. Complicates things in the frontend
    }[]
  }[]
}

export type ResponseDTO = (AdminPortalResponseDTO | UserListResponseDTO)[]
