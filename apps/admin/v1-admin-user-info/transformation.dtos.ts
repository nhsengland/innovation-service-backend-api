import type { ServiceRoleEnum } from '@admin/shared/enums';

export type ResponseDTO = {
  id: string;
  email: string;
  name: string;
  phone?: string;
  isActive: boolean;
  roles: {
    id: string;
    role: ServiceRoleEnum;
    isActive: boolean;
    organisation?: { id: string; name: string; acronym: string | null };
    organisationUnit?: { id: string; name: string; acronym: string };
    displayTeam?: string;
  }[];
};
