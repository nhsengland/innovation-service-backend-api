import type { UserTypeEnum } from '@innovations/shared/enums';

export type ResponseDTO = {
  participants: {
    id: string;
    name: string;
    type: UserTypeEnum
    organisationUnit: { id: string; acronym: string } | null;
  }[];
}