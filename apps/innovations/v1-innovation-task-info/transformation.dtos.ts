import type { InnovationTaskStatusEnum, ServiceRoleEnum } from '@innovations/shared/enums';
import type { CurrentCatalogTypes } from '@innovations/shared/schemas/innovation-record';

export type ResponseDTO = {
  id: string;
  displayId: string;
  status: InnovationTaskStatusEnum;
  section: CurrentCatalogTypes.InnovationSections;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: { name: string; isOwner?: boolean; role: ServiceRoleEnum };
  createdBy: {
    id: string;
    name: string;
    role: ServiceRoleEnum;
    organisationUnit?: { id: string; name: string; acronym?: string };
  };
  declineReason?: string;
};
