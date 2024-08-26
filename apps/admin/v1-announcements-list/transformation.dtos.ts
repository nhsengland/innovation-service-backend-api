import type { AnnouncementStatusEnum, AnnouncementTypeEnum } from '@admin/shared/enums';
import type { FilterPayload } from '@admin/shared/models/schema-engine/schema.model';

export type ResponseDTO = {
  count: number;
  data: {
    id: string;
    title: string;
    startsAt: Date;
    expiresAt: null | Date;
    status: AnnouncementStatusEnum;
    type: AnnouncementTypeEnum;
    filters: null | FilterPayload[];
  }[];
};
