import type { InnovationTaskStatusEnum } from '@innovations/shared/enums';
import type { CurrentCatalogTypes } from '@innovations/shared/schemas/innovation-record';

export type ResponseDTO = {
  count: number;
  data: {
    id: string;
    displayId: string;
    innovation: { id: string; name: string };
    status: InnovationTaskStatusEnum;
    section: CurrentCatalogTypes.InnovationSections;
    sameOrganisation: boolean;
    notifications?: number;
    createdAt: Date;
    createdBy: { name: string; displayTag: string };
    updatedAt: Date;
    updatedBy: { name: string; displayTag: string };
  }[];
};
