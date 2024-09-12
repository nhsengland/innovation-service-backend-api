import type { ServiceRoleEnum } from '@users/shared/enums';

export type ResponseDTO = {
  count: number;
  data: {
    accessor: { name: string; role: ServiceRoleEnum };
    innovations: { id: string; name: string }[];
  }[];
};
