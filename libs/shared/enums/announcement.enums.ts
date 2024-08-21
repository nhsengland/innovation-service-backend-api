export type AnnouncementParamsType = {
  content: string;
  link?: { label: string; url: string };
  filters?: any; // TODO: put the right type afterwards.
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
