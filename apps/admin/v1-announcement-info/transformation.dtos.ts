import type { AnnouncementStatusEnum, AnnouncementTypeEnum, ServiceRoleEnum } from '@admin/shared/enums';
import type { FilterPayload } from '@admin/shared/models/schema-engine/schema.model';

export type ResponseDTO = {
  id: string;
  title: string;
  userRoles: ServiceRoleEnum[];
  params: null | Record<string, unknown>;
  startsAt: Date;
  expiresAt: null | Date;
  status: AnnouncementStatusEnum;
  filters: null | FilterPayload[];
  sendEmail: boolean;
  type: AnnouncementTypeEnum;
};
