export const AnnouncementTemplateType = ['GENERIC', 'FILTERED', 'DEPRECATED'] as const;
export type AnnouncementTemplateType = (typeof AnnouncementTemplateType)[number];

export type AnnouncementParamsType = {
  GENERIC: {
    content: string;
    link?: { label: string; url: string };
  };
  FILTERED: {
    content: string;
    link?: { label: string; url: string };
    filters: any; // TODO: put the right type afterwards.
  };
  DEPRECATED: {
    inset?: { title?: string; content?: string; link?: { label: string; url: string } };
    content?: string;
    actionLink?: { label: string; url: string };
  };
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
