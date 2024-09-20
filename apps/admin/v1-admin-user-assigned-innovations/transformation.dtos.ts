import type { ServiceRoleEnum } from '@admin/shared/enums';

export type ResponseDTO = {
  count: number;
  data: {
    innovation: { id: string; name: string };
    supportedBy: { id: string; name: string; role: ServiceRoleEnum }[];
    unit: string;
  }[];
};
