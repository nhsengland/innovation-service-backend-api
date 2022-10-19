import type { AccessorOrganisationRoleEnum, InnovationCategoryCatalogueEnum, InnovationStatusEnum, InnovationSupportStatusEnum, InnovatorOrganisationRoleEnum } from '@innovations/shared/enums';
import type { DateISOType } from '@innovations/shared/types';

export type ResponseDTO = {
  count: number,
  overdue?: number,
  data: {
    id: string,
    name: string,
    status: InnovationStatusEnum,
    submittedAt: null | DateISOType,
    countryName: null | string,
    postCode: null | string,
    mainCategory: null | InnovationCategoryCatalogueEnum,
    otherMainCategoryDescription: null | string,
    isAssessmentOverdue?: boolean,
    assessment?: null | { id: string, createdAt: DateISOType, finishedAt: null | DateISOType, assignedTo: { name: string } },
    supports?: {
      id: string,
      status: InnovationSupportStatusEnum,
      organisation: {
        id: string, name: string, acronym: null | string,
        unit: {
          id: string, name: string, acronym: string,
          // Users only exists while a support is ENGAGING.
          users?: { name: string, role: AccessorOrganisationRoleEnum | InnovatorOrganisationRoleEnum }[]
        }
      }
    }[]
  }[]
}
