import type {
  InnovationGroupedStatusEnum,
  InnovationStatusEnum,
  InnovationSupportStatusEnum,
  PhoneUserPreferenceEnum
} from '@innovations/shared/enums';
import type { CurrentCatalogTypes } from '@innovations/shared/schemas/innovation-record';

export type ResponseDTO = {
  id: string;
  name: string;
  description: null | string;
  version: string;
  status: InnovationStatusEnum;
  archivedStatus?: InnovationStatusEnum;
  groupedStatus: InnovationGroupedStatusEnum;
  hasBeenAssessed: boolean;
  statusUpdatedAt: Date;
  submittedAt: null | Date;
  countryName: null | string;
  postCode: null | string;
  categories: CurrentCatalogTypes.catalogCategory[];
  otherCategoryDescription: null | string;
  owner?: {
    id: string;
    name: string;
    isActive: boolean;
    email?: string;
    contactByEmail?: boolean;
    contactByPhone?: boolean;
    contactByPhoneTimeframe?: PhoneUserPreferenceEnum | null;
    mobilePhone?: null | string;
    lastLoginAt?: null | Date;
    organisation?: { name: string; size: null | string; registrationNumber: null | string };
  };
  lastEndSupportAt: null | Date;
  assessment?: null | {
    id: string;
    createdAt: Date;
    finishedAt: null | Date;
    assignedTo?: { id: string; name: string; userRoleId: string };
  };
  supports?: null | { id: string; status: InnovationSupportStatusEnum; organisationUnitId: string }[];
  collaboratorId?: string;
  createdAt: Date;
};
