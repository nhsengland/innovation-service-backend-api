import type { PhoneUserPreferenceEnum } from '@users/shared/enums';
import type { RoleType } from '@users/shared/types';

export type ResponseDTO = {
  id: string;
  email: string;
  displayName: string;
  roles: RoleType[];
  contactByEmail: boolean;
  contactByPhone: boolean;
  contactByPhoneTimeframe: null | PhoneUserPreferenceEnum;
  contactDetails: null | string;
  phone: null | string;
  termsOfUseAccepted: boolean;
  hasInnovationTransfers: boolean;
  hasInnovationCollaborations: boolean;
  hasLoginAnnouncements: { [k: string]: boolean };
  passwordResetAt: null | Date;
  firstTimeSignInAt: null | Date;
  organisations: {
    id: string;
    acronym: string | null;
    name: string;
    isShadow: boolean;
    size: null | string;
    description: null | string;
    registrationNumber: null | string;
    organisationUnits: { id: string; name: string; acronym: string }[];
  }[];
};
