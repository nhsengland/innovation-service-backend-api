import type { InnovationActionStatusEnum, InnovationSectionCatalogueEnum } from '@innovations/shared/enums'
import type { DateISOType } from '@innovations/shared/types'

export type ResponseDTO = {
  count: number,
  data: {
    id: string,
    displayId: string,
    status: InnovationActionStatusEnum,
    section: InnovationSectionCatalogueEnum,
    description?: string,
    createdAt: DateISOType,
    updatedAt: DateISOType,
    innovation?: {
      id: string,
      name: string,
    },
    notifications: {
      count: number,
      data?: {
        id: string,
        contextType: string,
        contextId: string,
        innovationId: string,
        readAt: string,
      }[],
    },
  }[]
}
