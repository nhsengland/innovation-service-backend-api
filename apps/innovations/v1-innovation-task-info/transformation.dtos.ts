import type { InnovationTaskStatusEnum } from '@innovations/shared/enums';
import type { CurrentCatalogTypes } from '@innovations/shared/schemas/innovation-record';

export type ResponseDTO = {
  id: string;
  displayId: string;
  status: InnovationTaskStatusEnum;
  section: CurrentCatalogTypes.InnovationSections;
  descriptions: {
    description: string;
    createdAt: Date;
    name: string;
    displayTag: string;
  }[];
  sameOrganisation: boolean;
  threadId: string;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: { name: string; displayTag: string };
  createdBy: { name: string; displayTag: string };
};
