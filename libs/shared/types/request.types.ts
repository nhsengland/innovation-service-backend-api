import type { Context } from '@azure/functions';
import type { ServiceRoleEnum } from '../enums';

export type CustomContextType = Context & {
  auth: {
    user: {
      identityId: string,
      name: string
    },
    context: {
      organisationUnitId?: string,
      organisationId?: string,
    },
  }
}

export type AuthContextType = {
  currentRole?: ServiceRoleEnum,
  organisationUnitId?: string,
  organisationId?: string,
}

export type AppResponse<T = any> = {
  isRaw: boolean;
  status: number;
  body: T;
  headers: { [key: string]: string };
}
