import type { FilterPayload } from '../models/schema-engine/schema.model';

export type AnnouncementParamsType = {
  content: string;
  link?: { label: string; url: string };
  filters?: FilterPayload[];
};

export enum AnnouncementStatusEnum {
  SCHEDULED = 'SCHEDULED',
  ACTIVE = 'ACTIVE',
  DONE = 'DONE',
  DELETED = 'DELETED'
}

export enum AnnouncementTypeEnum {
  LOG_IN = 'LOG_IN',
  HOMEPAGE = 'HOMEPAGE'
}
