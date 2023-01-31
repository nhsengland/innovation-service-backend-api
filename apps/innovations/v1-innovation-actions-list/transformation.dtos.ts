import type { InnovationActionStatusEnum, InnovationSectionEnum, UserTypeEnum } from '@innovations/shared/enums'
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
    updatedBy: { name: string, role: UserTypeEnum }
    createdBy: { id: string, name: string, role: UserTypeEnum, organisationUnit?: { id: string, name: string, acronym?: string } }
    notifications?: number
  }[]
};
