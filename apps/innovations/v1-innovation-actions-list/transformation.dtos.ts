import type { InnovationActionStatusEnum, InnovationSectionEnum } from '@innovations/shared/enums'
import type { DateISOType } from '@innovations/shared/types'

export type ResponseDTO = {
  count: number,
  data: {
    id: string,
    displayId: string,
    description: string,
    innovation: { id: string, name: string },
    status: InnovationActionStatusEnum,
    section: InnovationSectionEnum,
    createdAt: DateISOType,
    updatedAt: DateISOType,
    notifications?: number
  }[]
};
