import type { UserTypeEnum } from '@users/shared/enums';

export type ResponseDTO = {
  id: string,
  name: string,
  email?: string,
  type?: UserTypeEnum,
  isActive?: boolean,
  organisationUnitUserId?: string
}[]
