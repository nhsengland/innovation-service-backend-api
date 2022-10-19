import type { DateISOType } from "@innovations/shared/types";

export type ResponseDTO = {
  thread: {
    id: string;
    subject: string;
    createdBy: {
      id: string;
    };
    createdAt: DateISOType;
  }
}
