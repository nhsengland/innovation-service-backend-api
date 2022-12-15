import type { UserTypeEnum } from '@innovations/shared/enums';
import type { DateISOType } from '@innovations/shared/types';

export type ResponseDTO = {
  id: string;
  subject: string;
  createdAt: DateISOType;
  createdBy: {
    id: string;
    name: string;
    type: UserTypeEnum;
  };
}
