import type { AccessorOrganisationRoleEnum, InnovationGroupedStatusEnum, InnovationStatusEnum, InnovationSupportStatusEnum, InnovatorOrganisationRoleEnum } from '@innovations/shared/enums';
import type { CurrentCatalogTypes } from '@innovations/shared/schemas/innovation-record';


export type ResponseDTO = {
  count: number,
  overdue?: number,
  data: {
    id: string,
    name: string,
    description: null | string,
    status: InnovationStatusEnum,
    groupedStatus?: InnovationGroupedStatusEnum,
    statusUpdatedAt: Date,
    submittedAt: null | Date,
    updatedAt: null | Date,
    countryName: null | string,
    postCode: null | string,
    mainCategory: null | CurrentCatalogTypes.catalogCategory,
    otherMainCategoryDescription: null | string,
    isAssessmentOverdue?: boolean,
    assessment?: null | { id: string, createdAt: Date, finishedAt: null | Date, assignedTo: { name: string }, reassessmentCount: number },
    supports?: {
      id: string,
      status: InnovationSupportStatusEnum,
      updatedAt: Date,
      organisation: {
        id: string, name: string, acronym: null | string,
        unit: {
          id: string, name: string, acronym: string,
          // Users only exists while a support is ENGAGING.
          users?: { name: string, role: AccessorOrganisationRoleEnum | InnovatorOrganisationRoleEnum }[]
        }
      }
    }[],
    notifications?: number,
    statistics?: {
      actions: number,
      messages: number
    }
  }[]
};
