import type { Context } from '@azure/functions';

export type CustomContextType = Context & {
  auth: {
    user: {
      identityId: string,
      name: string
      // surveyId?: string
    }
  }
}

export type AppResponse = {
  isRaw: boolean;
  status: number;
  body: any;
  headers: { [key: string]: string };
}
