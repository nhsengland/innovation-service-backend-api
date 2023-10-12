import type { ServiceRoleEnum } from '@innovations/shared/enums';

export type ResponseDTO = {
  followers: {
    id: string;
    name: string;
    isLocked: boolean;
    isOwner?: boolean;
    role: { id: string; role: ServiceRoleEnum }
    organisationUnit: { id: string; acronym: string } | null;
  }[];
};
