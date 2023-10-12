import type { ThreadContextTypeEnum } from '@innovations/shared/enums';

export type ResponseDTO = {
  id: string;
  subject: string;
  context?: {
    type: ThreadContextTypeEnum;
    id: string;
  };
  createdAt: Date;
  createdBy: {
    id: string;
    name: string;
  };
};
