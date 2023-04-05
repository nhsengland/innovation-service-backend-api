import type { InnovationSectionStatusEnum } from '@innovations/shared/enums';
import type { CurrentCatalogTypes } from '@innovations/shared/schemas/innovation-record';
import type { DateISOType } from '@innovations/shared/types';


export type ResponseDTO = {
  id: null | string,
  section: CurrentCatalogTypes.InnovationSections,
  status: InnovationSectionStatusEnum,
  submittedAt: null | DateISOType,
  submittedBy: null | {
    name: string,
    isOwner: boolean,
  },
  data: null | { [key: string]: any },
  actionsIds?: string[]
}
