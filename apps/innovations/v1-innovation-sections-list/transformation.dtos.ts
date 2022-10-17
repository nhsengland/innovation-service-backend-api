import type { InnovationSectionCatalogueEnum, InnovationSectionStatusEnum, InnovationStatusEnum } from '@innovations/shared/enums'
import type { DateISOType } from '@notifications/shared/types';

export type ResponseDTO = {
  id: string;
  name: string;
  status: InnovationStatusEnum;
  sections: {
    id: null | string;
    section: InnovationSectionCatalogueEnum;
    status: InnovationSectionStatusEnum;
    submittedAt: null | DateISOType;
  }[];
}
