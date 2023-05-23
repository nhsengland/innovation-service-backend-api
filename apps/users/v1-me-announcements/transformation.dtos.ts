import type { AnnouncementTemplateType } from '@users/shared/enums';

export type ResponseDTO = {
  id: string;
  title: string;
  template: AnnouncementTemplateType;
  startsAt: Date;
  expiresAt: null | Date;
  params: null | Record<string, unknown>;
}[];
