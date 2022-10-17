import type { InnovationSectionCatalogueEnum, InnovationSectionStatusEnum } from '@innovations/shared/enums'
import type { DateISOType } from '@notifications/shared/types'

export type ResponseDTO = {
  id: null | string,
  section: InnovationSectionCatalogueEnum,
  status: InnovationSectionStatusEnum,
  submittedAt: null | DateISOType
  data: null | { [key: string]: any }
}
