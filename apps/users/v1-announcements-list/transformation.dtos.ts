import type { AnnouncementTemplateType, ServiceRoleEnum } from '@users/shared/enums';
import type { DateISOType } from '@users/shared/types';

export type ResponseDTO = {
  id: string,
  template: AnnouncementTemplateType,
  targetRoles: ServiceRoleEnum[],
  params: Record<string, unknown> | null,
  createdAt: DateISOType
}[];
