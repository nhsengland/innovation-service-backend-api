import type { ServiceRoleEnum } from '@innovations/shared/enums';



export type ResponseDTO = {
  count: number,
  threads: {
    id: string,
    subject: string,
    messageCount: number,
    createdAt: Date,
    isNew: boolean,
    lastMessage: {
      id: string,
      createdAt: Date,
      createdBy: {
        id: string, name: string,
        type: ServiceRoleEnum,
        isOwner?: boolean,
        organisationUnit: null | { id: string; name: string; acronym: string }
      }
    }
  }[]
};
