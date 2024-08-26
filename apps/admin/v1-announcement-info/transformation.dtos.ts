import type { AnnouncementStatusEnum, ServiceRoleEnum } from '@admin/shared/enums';
import { FilterPayload } from '@admin/shared/models/schema-engine/schema.model';

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
};
