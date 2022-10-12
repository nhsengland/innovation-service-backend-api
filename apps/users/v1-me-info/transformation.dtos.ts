import type { AccessorOrganisationRoleEnum, InnovatorOrganisationRoleEnum, ServiceRoleEnum, UserTypeEnum } from '@users/shared/enums';
import type { DateISOType } from '@users/shared/types';

export type ResponseDTO = {
  id: string,
  email: string,
  displayName: string,
  type: UserTypeEnum,
  roles: ServiceRoleEnum[],
  phone: null | string,
  termsOfUseAccepted: boolean,
  hasInnovationTransfers: boolean,
  passwordResetAt: null | DateISOType,
  firstTimeSignInAt: null | DateISOType,
  organisations: {
    id: string,
    name: string,
    role: InnovatorOrganisationRoleEnum | AccessorOrganisationRoleEnum,
    isShadow: boolean,
    size: null | string,
    organisationUnits: { id: string; name: string; acronym: string; }[]
  }[]
};
