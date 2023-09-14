import type { ServiceRoleEnum } from '@innovations/shared/enums';

export type ResponseDTO = {
  followers: {
    id: string;
    name: string;
    type: ServiceRoleEnum | undefined;
    isLocked: boolean;
    isOwner?: boolean;
    organisationUnit: { id: string; acronym: string } | null;
  }[];
};
