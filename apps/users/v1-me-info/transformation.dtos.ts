import type { AccessorOrganisationRoleEnum, InnovatorOrganisationRoleEnum, PhoneUserPreferenceEnum } from '@users/shared/enums';
import type { DateISOType, RoleType } from '@users/shared/types';

export type ResponseDTO = {
  id: string,
  email: string,
  displayName: string,
  roles: RoleType[],
  contactByEmail: boolean,
  contactByPhone: boolean,
  contactByPhoneTimeframe: null | PhoneUserPreferenceEnum,
  contactDetails: null | string,
  phone: null | string,
  termsOfUseAccepted: boolean,
  hasInnovationTransfers: boolean,
  hasInnovationCollaborations: boolean,
  hasAnnouncements: boolean,
  passwordResetAt: null | DateISOType,
  firstTimeSignInAt: null | DateISOType,
  organisations: {
    id: string,
    acronym: string | null,
    name: string,
    role: InnovatorOrganisationRoleEnum | AccessorOrganisationRoleEnum,
    isShadow: boolean,
    size: null | string,
    description: null | string,
    registrationNumber: null | string,
    organisationUnits: { id: string; name: string; acronym: string; }[]
  }[]
};
