import type { InnovationActionStatusEnum, InnovationSectionEnum, UserTypeEnum } from '@innovations/shared/enums'
import type { DateISOType } from '@innovations/shared/types'

export type ResponseDTO = {
  id: string,
  displayId: string,
  status: InnovationActionStatusEnum,
  section: InnovationSectionEnum,
  description: string,
  createdAt: DateISOType,
  updatedAt: DateISOType,
  updatedBy: { name: string, role: UserTypeEnum }
  createdBy: { id: string, name: string, role: UserTypeEnum, organisationUnit?: { id: string, name: string, acronym?: string } }
  declineReason?: string
}
