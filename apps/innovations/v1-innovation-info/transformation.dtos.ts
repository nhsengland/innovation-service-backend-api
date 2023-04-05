import type { InnovationGroupedStatusEnum, InnovationStatusEnum, InnovationSupportStatusEnum, PhoneUserPreferenceEnum } from '@innovations/shared/enums';
import type { CurrentCatalogTypes } from '@innovations/shared/schemas/innovation-record';
import type { DateISOType } from '@innovations/shared/types';

export type ResponseDTO = {
  id: string,
  name: string,
  description: null | string,
  status: InnovationStatusEnum,
  groupedStatus: InnovationGroupedStatusEnum,
  statusUpdatedAt: DateISOType,
  submittedAt: null | DateISOType,
  countryName: null | string,
  postCode: null | string,
  categories: CurrentCatalogTypes.catalogCategory[],
  otherCategoryDescription: null | string,
  owner?: {
    id: string,
    name: string,
    isActive: boolean,
    email?: string,
    contactByEmail?: boolean,
    contactByPhone?: boolean,
    contactByPhoneTimeframe?: PhoneUserPreferenceEnum | null,
    mobilePhone?: null | string,
    organisations: null | { name: string, size: null | string }[],
    lastLoginAt?: null | DateISOType
  },
  lastEndSupportAt: null | DateISOType,
  export: { canUserExport: boolean, pendingRequestsCount: number },
  assessment?: null | { id: string, createdAt: DateISOType, finishedAt: null | DateISOType, assignedTo: { id: string, name: string }, reassessmentCount: number },
  supports?: null | { id: string, status: InnovationSupportStatusEnum, organisationUnitId: string }[],
  collaboratorId?: string
};
