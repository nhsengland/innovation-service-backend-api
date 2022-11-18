import type { InnovationCategoryCatalogueEnum, InnovationStatusEnum, InnovationSupportStatusEnum } from '@innovations/shared/enums';
import type { DateISOType } from '@innovations/shared/types';

export type ResponseDTO = {
  id: string,
  name: string,
  description: null | string,
  status: InnovationStatusEnum,
  submittedAt: null | DateISOType,
  countryName: null | string,
  postCode: null | string,
  categories: InnovationCategoryCatalogueEnum[],
  otherCategoryDescription: null | string,
  owner: {
    id: string,
    name: string,
    isActive: boolean,
    email?: string,
    mobilePhone?: null | string,
    organisations: null | { name: string, size: null | string }[]
  },
  lastEndSupportAt: null | DateISOType,
  export: { canUserExport: boolean, activeRequestsCount: number },
  assessment?: null | { id: string, createdAt: DateISOType, finishedAt: null | DateISOType, assignedTo: { name: string }, reassessmentCount: number },
  supports?: null | { id: string, status: InnovationSupportStatusEnum, organisationUnitId: string }[]
};
