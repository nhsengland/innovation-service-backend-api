import type { AnnouncementTemplateType, ServiceRoleEnum } from '@users/shared/enums';


export type ResponseDTO = {
  id: string,
  template: AnnouncementTemplateType,
  targetRoles: ServiceRoleEnum[],
  params: Record<string, unknown> | null,
  createdAt: Date
}[];
