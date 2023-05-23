import type { AnnouncementStatusEnum, ServiceRoleEnum } from '@admin/shared/enums';

export type ResponseDTO = {
  id: string;
  title: string;
  userRoles: ServiceRoleEnum[];
  params: null | Record<string, unknown>;
  startsAt: Date;
  expiresAt: null | Date;
  status: AnnouncementStatusEnum;
};
