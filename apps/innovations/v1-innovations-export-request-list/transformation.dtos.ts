import type { InnovationExportRequestStatusEnum } from '@innovations/shared/enums';

export type ResponseDTO = {
  count: number;
  data: {
    id: string;
    status: InnovationExportRequestStatusEnum;
    createdBy: {
      name: string;
      displayRole?: string;
      displayTeam?: string;
    };
    createdAt: Date;
  }[];
};
