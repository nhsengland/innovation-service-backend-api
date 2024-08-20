export const AnnouncementTemplateType = ['GENERIC'] as const;
export type AnnouncementTemplateType = (typeof AnnouncementTemplateType)[number];

export type AnnouncementParamsType = {
  GENERIC: {
    inset?: { title?: string; content?: string; link?: { label: string; url: string } };
    content?: string;
    actionLink?: { label: string; url: string };
  };
};

export type AnnouncementFilterPayload = {
  section: string;
  question: string;
  answers: string[];
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
