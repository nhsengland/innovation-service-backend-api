import type { Context } from '@azure/functions';

export type CustomContextType = Context & {
  auth: {
    user: {
      identityId: string,
      name: string
      // surveyId?: string
    },
    organisationUnitId: string,
  }
}

export type AppResponse<T = any> = {
  isRaw: boolean;
  status: number;
  body: T;
  headers: { [key: string]: string };
}
