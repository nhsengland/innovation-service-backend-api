import type { InnovationSupportStatusEnum } from '@innovations/shared/enums';

export type ResponseDTO = {
  id: string,
  status: InnovationSupportStatusEnum,
  organisation: {
    id: string, name: string, acronym: string,
    unit: { id: string, name: string, acronym: string }
  },
  engagingAccessors?: { id: string, organisationUnitUserId: string, name: string }[]
}[];
