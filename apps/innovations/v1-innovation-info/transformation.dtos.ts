import type {
  InnovationGroupedStatusEnum,
  InnovationStatusEnum,
  InnovationSupportStatusEnum,
  PhoneUserPreferenceEnum,
} from '@innovations/shared/enums';
import type { CurrentCatalogTypes } from '@innovations/shared/schemas/innovation-record';

export type ResponseDTO = {
  id: string;
  name: string;
  description: null | string;
  version: string;
  status: InnovationStatusEnum;
  groupedStatus: InnovationGroupedStatusEnum;
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
    organisations: null | { name: string; size: null | string }[];
    lastLoginAt?: null | Date;
  };
  lastEndSupportAt: null | Date;
  export: { canUserExport: boolean; pendingRequestsCount: number };
  assessment?: null | {
    id: string;
    createdAt: Date;
    finishedAt: null | Date;
    assignedTo: { id: string; name: string };
    reassessmentCount: number;
  };
  supports?:
    | null
    | { id: string; status: InnovationSupportStatusEnum; organisationUnitId: string }[];
  collaboratorId?: string;
  createdAt: Date;
};
