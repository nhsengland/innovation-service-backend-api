import { ServiceRoleEnum } from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import { ENV } from '../_config';

export const taskUrl = (role: ServiceRoleEnum, innovationId: string, taskId: string): string => {
  const baseUrl = frontendBaseUrl(role);
  return new UrlModel(ENV.webBaseTransactionalUrl)
    .addPath(':baseUrl/innovations/:innovationId/tasks/:taskId')
    .setPathParams({ baseUrl, innovationId, taskId })
    .buildUrl();
};

export const threadUrl = (role: ServiceRoleEnum, innovationId: string, threadId: string): string => {
  const baseUrl = frontendBaseUrl(role);
  return new UrlModel(ENV.webBaseTransactionalUrl)
    .addPath(':baseUrl/innovations/:innovationId/threads/:threadId')
    .setPathParams({ baseUrl, innovationId, threadId })
    .buildUrl();
};

export const documentUrl = (role: ServiceRoleEnum, innovationId: string, documentId: string): string => {
  const baseUrl = frontendBaseUrl(role);
  return new UrlModel(ENV.webBaseTransactionalUrl)
    .addPath(':baseUrl/innovations/:innovationId/documents/:documentId')
    .setPathParams({ baseUrl, innovationId, documentId })
    .buildUrl();
};

export const supportSummaryUrl = (role: ServiceRoleEnum, innovationId: string): string => {
  const baseUrl = frontendBaseUrl(role);
  return new UrlModel(ENV.webBaseTransactionalUrl)
    .addPath(':baseUrl/innovations/:innovationId/support-summary')
    .setPathParams({ baseUrl, innovationId })
    .buildUrl();
};

export const frontendBaseUrl = (role: ServiceRoleEnum): string => {
  switch (role) {
    case ServiceRoleEnum.ASSESSMENT:
      return 'assessment';
    case ServiceRoleEnum.ACCESSOR:
    case ServiceRoleEnum.QUALIFYING_ACCESSOR:
      return 'accessor';
    case ServiceRoleEnum.INNOVATOR:
      return 'innovator';
    case ServiceRoleEnum.ADMIN:
      return 'admin';
    default: {
      const x: never = role;
      throw new Error(`Unknown role: ${x}`); // never happens
    }
  }
};
