import type { InnovationActionStatusEnum, InnovationSectionCatalogueEnum } from '@innovations/shared/enums'
import type { DateISOType } from '@innovations/shared/types'

export type ResponseDTO = {
  id: string,
  displayId: string,
  status: InnovationActionStatusEnum,
  section: InnovationSectionCatalogueEnum,
  description: string,
  createdAt: DateISOType,
  createdBy: string
}
