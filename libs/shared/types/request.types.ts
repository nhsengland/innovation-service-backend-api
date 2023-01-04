import type { Context } from '@azure/functions';
import type { UserTypeEnum } from '../enums';

export type CustomContextType = Context & {
  auth: {
    user: {
      identityId: string,
      name: string
    },
    context: {
      userType: UserTypeEnum,
      organisationUnitId?: string,
      organisationId?: string,
    },
  }
}

export type AuthContextType = {
  userType: UserTypeEnum,
  organisationUnitId?: string,
  organisationId?: string,
}

export type AppResponse<T = any> = {
  isRaw: boolean;
  status: number;
  body: T;
  headers: { [key: string]: string };
}
