import type { ServiceRoleEnum } from '@innovations/shared/enums';

export type ResponseDTO = {
  followers: {
    id: string;
    name: string;
    type: ServiceRoleEnum | undefined;
    isOwner?: boolean;
    organisationUnit: { id: string; acronym: string } | null;
  }[];
};
