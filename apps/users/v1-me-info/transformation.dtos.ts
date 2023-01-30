import type { AccessorOrganisationRoleEnum, InnovatorOrganisationRoleEnum, PhoneUserPreferenceEnum, ServiceRoleEnum, UserTypeEnum } from '@users/shared/enums';
import type { DateISOType } from '@users/shared/types';

export type ResponseDTO = {
  id: string,
  email: string,
  displayName: string,
  type: UserTypeEnum,
  roles: ServiceRoleEnum[],
  contactByEmail: boolean,
  contactByPhone: boolean,
  contactByPhoneTimeframe: null | PhoneUserPreferenceEnum,
  contactDetails: null | string,
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
