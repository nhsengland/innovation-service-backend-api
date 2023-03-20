import type { DateISOType } from '@innovations/shared/types';

export type ResponseDTO = {
  count: number;
  messages: {
    id: string;
    message: string;
    createdAt: DateISOType;
    isNew: boolean;
    isEditable: boolean;
    createdBy: {
      id: string;
      name: string;
      role: string;
      isOwner?: boolean;
      organisation: { id: string; name: string; acronym: string | null } | undefined;
      organisationUnit: { id: string; name: string; acronym: string | null } | undefined;
    };
    updatedAt: DateISOType;
  }[];
}
