import type { ServiceRoleEnum } from '@users/shared/enums';

export type ResponseDTO = {
  id: string;
  name: string;
  email: string;
  role: null | ServiceRoleEnum;
};
