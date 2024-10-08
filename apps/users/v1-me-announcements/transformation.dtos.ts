import type { AnnouncementParamsType } from '@users/shared/enums';

export type ResponseDTO = {
  id: string;
  title: string;
  startsAt: Date;
  expiresAt: null | Date;
  params: null | AnnouncementParamsType;
  innovations?: string[];
}[];
