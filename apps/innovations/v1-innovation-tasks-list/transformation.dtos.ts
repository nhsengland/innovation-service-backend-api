import type { InnovationTaskStatusEnum, ServiceRoleEnum } from '@innovations/shared/enums';
import type { CurrentCatalogTypes } from '@innovations/shared/schemas/innovation-record';

export type ResponseDTO = {
  count: number;
  data: {
    id: string;
    displayId: string;
    description: string;
    innovation: { id: string; name: string };
    status: InnovationTaskStatusEnum;
    section: CurrentCatalogTypes.InnovationSections;
    createdAt: Date;
    updatedAt: Date;
    updatedBy: { name: string; role?: ServiceRoleEnum | undefined };
    createdBy: {
      id: string;
      name: string;
      role?: ServiceRoleEnum | undefined;
      organisationUnit?: { id: string; name: string; acronym?: string };
    };
    notifications?: number;
  }[];
};
