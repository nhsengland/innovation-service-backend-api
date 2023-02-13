import type { ServiceRoleEnum } from '@innovations/shared/enums';

export type ResponseDTO = {
  participants: {
    id: string;
    name: string;
    type: ServiceRoleEnum | undefined;
    organisationUnit: { id: string; acronym: string } | null;
  }[];
}