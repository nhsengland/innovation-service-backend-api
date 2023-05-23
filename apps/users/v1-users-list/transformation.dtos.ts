import type { UserRoleEntity } from '@users/shared/entities';
import type { AccessorOrganisationRoleEnum, InnovatorOrganisationRoleEnum } from '@users/shared/enums';
import type { RoleType } from '@users/shared/types';

type AdminPortalResponseDTO = {
  id: string;
  email: string;
  name: string;
  roles: Pick<RoleType, 'role'>[]; // this might change in the future keeping this way for compatibility
  isActive: boolean;
  lockedAt?: Date;
  organisations?: {
    id: string;
    name: string;
    acronym: string;
    role: InnovatorOrganisationRoleEnum | AccessorOrganisationRoleEnum;
    units?: {
      id: string;
      name: string;
      acronym: string;
    }[];
  }[];
};

type UserListResponseDTO = {
  count: number;
  data: {
    id: string;
    name: string;
    roles: UserRoleEntity[];
    lockedAt: Date | null;
    email?: string;
    organisationUnitUserId?: string;
  }[];
};

export type ResponseDTO = AdminPortalResponseDTO[] | UserListResponseDTO;
