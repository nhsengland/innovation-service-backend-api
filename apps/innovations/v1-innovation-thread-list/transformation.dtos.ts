import type { DateISOType } from '@innovations/shared/types';


export type ResponseDTO = {
  count: number,
  threads: {
    id: string,
    subject: string,
    messageCount: number,
    createdAt: DateISOType,
    isNew: boolean,
    lastMessage: {
      id: string,
      createdAt: DateISOType,
      createdBy: {
        id: string, name: string,
        organisationUnit: null | { id: string; name: string; acronym: string }
      }
    }
  }[]
};
