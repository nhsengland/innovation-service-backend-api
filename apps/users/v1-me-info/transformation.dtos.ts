import type { AccessorOrganisationRoleEnum, InnovatorOrganisationRoleEnum, ServiceRoleEnum, UserTypeEnum } from '@users/shared/enums';

export type ResponseDTO = {
  id: string,
  email: string,
  displayName: string,
  type: UserTypeEnum,
  roles: ServiceRoleEnum[],
  phone: string | null,
  passwordResetOn: null | string,
  organisations: {
    id: string,
    name: string,
    role: InnovatorOrganisationRoleEnum | AccessorOrganisationRoleEnum,
    isShadow: boolean,
    size: null | string,
    organisationUnits: { id: string; name: string; acronym: string; }[]
  }[]
};
