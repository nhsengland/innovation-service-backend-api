import type { InnovationSectionStatusEnum } from '@innovations/shared/enums';
import type { CurrentCatalogTypes } from '@innovations/shared/schemas/innovation-record';



export type ResponseDTO = {
  id: null | string,
  section: CurrentCatalogTypes.InnovationSections,
  status: InnovationSectionStatusEnum,
  submittedAt: null | Date,
  submittedBy: null | {
    name: string,
    isOwner: boolean,
  },
  data: null | { [key: string]: any },
  actionsIds?: string[]
}
