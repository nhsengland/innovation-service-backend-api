import type { InnovationActionStatusEnum, InnovationSectionEnum } from '@innovations/shared/enums'
import type { DateISOType } from '@innovations/shared/types'

export type ResponseDTO = {
  id: string,
  displayId: string,
  status: InnovationActionStatusEnum,
  section: InnovationSectionEnum,
  description: string,
  createdAt: DateISOType,
  createdBy: string
}
