import type { InnovationActionStatusEnum, ServiceRoleEnum } from '@innovations/shared/enums';
import type { CurrentCatalogTypes } from '@innovations/shared/schemas/innovation-record';
import type { DateISOType } from '@innovations/shared/types';

export type ResponseDTO = {
  count: number,
  data: {
    id: string,
    displayId: string,
    description: string,
    innovation: { id: string, name: string },
    status: InnovationActionStatusEnum,
    section: CurrentCatalogTypes.InnovationSections,
    createdAt: DateISOType,
    updatedAt: DateISOType,
    updatedBy: { name: string, role?: ServiceRoleEnum | undefined }
    createdBy: { id: string, name: string, role?: ServiceRoleEnum | undefined, organisationUnit?: { id: string, name: string, acronym?: string } }
    notifications?: number
  }[]
};
