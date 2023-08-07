import type { InnovationExportRequestStatusEnum } from '@innovations/shared/enums';

export type ResponseDTO = {
  id: string;
  status: InnovationExportRequestStatusEnum;
  requestReason: string;
  rejectReason?: string;
  createdBy: {
    name: string;
    displayRole?: string;
    displayTeam?: string;
  };
  createdAt: Date;
  updatedBy: { name: string };
  updatedAt: Date;
};
