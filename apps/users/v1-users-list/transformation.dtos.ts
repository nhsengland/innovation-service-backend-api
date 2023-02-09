import type { UserRoleEntity } from '@users/shared/entities';
import type { AccessorOrganisationRoleEnum, InnovatorOrganisationRoleEnum } from '@users/shared/enums';
import type { DateISOType } from '@users/shared/types';

type AdminPortalResponseDTO = {
  id: string;
  email: string;
  name: string;
  roles: UserRoleEntity[]; // This needs to be reviewed as it's not a DTO
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
  roles: UserRoleEntity[]; // This needs to be reviewed as it's not a DTO
  isActive: boolean;
  organisations?: {
    name: string;
    role: InnovatorOrganisationRoleEnum | AccessorOrganisationRoleEnum;
    units?: {
      name: string;
      organisationUnitUserId: string // It's strange that we require this and use this id instead of the user id (or now the role id) to identify the user. Complicates things in the frontend
    }[]
  }[]
}

export type ResponseDTO = (AdminPortalResponseDTO | UserListResponseDTO)[]
