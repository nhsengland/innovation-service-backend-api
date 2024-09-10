export type AnnouncementParamsType = {
  content: string;
  link?: { label: string; url: string };
};
export type SimpleAnnouncementType = {
  id: string;
  title: string;
  params: AnnouncementParamsType;
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
