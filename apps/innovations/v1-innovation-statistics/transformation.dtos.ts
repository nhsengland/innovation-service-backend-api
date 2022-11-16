import type { InnovationSectionEnum, InnovationSectionStatusEnum, InnovationStatusEnum } from '@innovations/shared/enums'
import type { DateISOType } from '@notifications/shared/types';

export type ResponseDTO = {
  id: string;
  name: string;
  status: InnovationStatusEnum;
  exportRequests: number;
  sections: {
    id: null | string;
    section: InnovationSectionEnum;
    status: InnovationSectionStatusEnum;
    submittedAt: null | DateISOType;
  }[];
}
