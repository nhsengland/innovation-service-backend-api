import type {
  InnovationGroupedStatusEnum,
  InnovationStatusEnum,
  InnovationSupportStatusEnum,
  ServiceRoleEnum
} from '@innovations/shared/enums';
import type { CurrentCatalogTypes } from '@innovations/shared/schemas/innovation-record';

export type ResponseDTO = {
  count: number;
  data: {
    id: string;
    name: string;
    description: null | string;
    status: InnovationStatusEnum;
    groupedStatus?: InnovationGroupedStatusEnum;
    statusUpdatedAt: Date;
    submittedAt: null | Date;
    updatedAt: null | Date;
    countryName: null | string;
    postCode: null | string;
    mainCategory: null | CurrentCatalogTypes.catalogCategory;
    otherMainCategoryDescription: null | string;
    assessment?: null | {
      id: string;
      createdAt: Date;
      finishedAt: null | Date;
      assignedTo: { name: string };
      reassessmentCount: number;
      isExempted?: boolean;
    };
    supports?: {
      id: string;
      status: InnovationSupportStatusEnum;
      updatedAt: Date;
      organisation: {
        id: string;
        name: string;
        acronym: null | string;
        unit: {
          id: string;
          name: string;
          acronym: string;
          // Users only exists while a support is ENGAGING.
          users?: {
            name: string;
            role: ServiceRoleEnum
          }[];
        };
      };
    }[];
    notifications?: number;
    statistics?: {
      actions: number;
      messages: number;
    };
  }[];
};
