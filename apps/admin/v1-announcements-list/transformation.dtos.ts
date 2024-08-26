import type { AnnouncementStatusEnum, AnnouncementTypeEnum } from '@admin/shared/enums';

export type ResponseDTO = {
  count: number;
  data: {
    id: string;
    title: string;
    startsAt: Date;
    expiresAt: null | Date;
    status: AnnouncementStatusEnum;
    type: AnnouncementTypeEnum;
  }[];
};
