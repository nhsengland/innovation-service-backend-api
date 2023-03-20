import type { InnovationActionStatusEnum, InnovationSectionEnum, ServiceRoleEnum } from '@innovations/shared/enums';
import type { DateISOType } from '@innovations/shared/types';

export type ResponseDTO = {
  id: string,
  displayId: string,
  status: InnovationActionStatusEnum,
  section: InnovationSectionEnum,
  description: string,
  createdAt: DateISOType,
  updatedAt: DateISOType,
  updatedBy: { name: string, isOwner?: boolean, role: ServiceRoleEnum }
  createdBy: { id: string, name: string, role: ServiceRoleEnum, organisationUnit?: { id: string, name: string, acronym?: string } }
  declineReason?: string
}
