import type { UserRoleEntity } from '@users/shared/entities';
import type { AccessorOrganisationRoleEnum, InnovatorOrganisationRoleEnum } from '@users/shared/enums';

export type ResponseDTO = {
  id: string;
  email?: string;
  name: string;
  roles: UserRoleEntity[];
  isActive: boolean;
  organisations?: {
    name: string;
    role: InnovatorOrganisationRoleEnum | AccessorOrganisationRoleEnum;
    units?: {
      name: string;
      organisationUnitUserId: string
    }[]
  }[]
}[]
