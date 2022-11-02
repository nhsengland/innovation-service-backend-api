import type { AccessorOrganisationRoleEnum, InnovatorOrganisationRoleEnum, UserTypeEnum } from '@users/shared/enums';

export type ResponseDTO = {
  id: string;
  name: string;
  type: UserTypeEnum;
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
